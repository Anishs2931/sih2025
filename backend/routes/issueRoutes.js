const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const upload = multer();
const { detect } = require("../issue/detectIssue");
// Google Cloud Storage (GCS) direct client
const { getBucket } = require("../gcs");
const db = require("../firebase");

const router = express.Router();

router.post("/detect", upload.any(), async (req, res) => {
  try {
    const incomingFiles = Array.isArray(req.files) && req.files.length > 0
      ? req.files
      : (req.file ? [req.file] : []);
    if (incomingFiles.length === 0 || !incomingFiles[0].buffer) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    const primaryFile = incomingFiles[0];
    const imageBuffer = primaryFile.buffer;
    const mimeToExt = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic"
    };

  const guessedExt = mimeToExt[primaryFile.mimetype] || path.extname(primaryFile.originalname) || ".jpg";
    
    let { location, floor, sector, instructions } = req.body;
  const result = await detect(imageBuffer, { location, floor, sector, instructions });

    // Prepare Google Cloud Storage bucket and object path
    // Only upload images to GCS when an issue is detected (success === true)
    let pictureIds = [];
    if (result && result.success && result.taskId) {
      try {
        const bucket = getBucket();
        for (const f of incomingFiles) {
          const ext = mimeToExt[f.mimetype] || path.extname(f.originalname) || ".jpg";
          const pictureId = (crypto.randomUUID && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : crypto.createHash("sha1").update(f.buffer).digest("hex");
          const objectPath = `${pictureId}${ext}`; // no folder, flat at bucket root
          const gcsFile = bucket.file(objectPath);

          const [exists] = await gcsFile.exists();
          if (!exists) {
            await gcsFile.save(f.buffer, {
              contentType: f.mimetype || "application/octet-stream",
              resumable: false,
              metadata: { cacheControl: "public, max-age=31536000" }
            });
            console.log(`[issueRoutes] Uploaded issue image to gs://${bucket.name}/${objectPath}`);
          } else {
            console.log(`[issueRoutes] Reusing existing image at gs://${bucket.name}/${objectPath}`);
          }

          pictureIds.push(pictureId);
        }

        // Store the picture metadata (ids) along with the task in Firestore
        try {
          await db.collection('tasks').doc(result.taskId).set({ pictureIds }, { merge: true });
        } catch (e) {
          console.warn('[issueRoutes] Failed to save pictureIds on task:', e?.message || e);
        }
      } catch (e) {
        console.error("[issueRoutes] GCS upload failed:", e?.message || e);
      }
    }

    if (result.noIssueDetected) {
      res.status(422).json({ ...result });
    } else if (result.success) {
      res.status(200).json({ ...result, pictureIds });
    } else {
      res.status(400).json({ ...result });
    }
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

module.exports = router;