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
    
    // Debug logging for route
    console.log('🔍 DEBUG issueRoutes /detect:');
    console.log('  Raw req.body:', JSON.stringify(req.body, null, 2));
    console.log('  Extracted location:', location);
    console.log('  Location type:', typeof location);
    
  const result = await detect(imageBuffer, { location, floor, sector, instructions });

    // Prepare Google Cloud Storage bucket and object path
    // Only upload images to GCS when an issue is detected (success === true)
    let reportImageIds = [];
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
            console.log(`[issueRoutes] Uploaded report image to gs://${bucket.name}/${objectPath}`);
          } else {
            console.log(`[issueRoutes] Reusing existing image at gs://${bucket.name}/${objectPath}`);
          }

          reportImageIds.push(pictureId);
        }

        // Update the task with report images using the new schema
        try {
          await db.collection('tasks').doc(result.taskId).update({
            report_images: reportImageIds,
            pictureIds: reportImageIds // Legacy support
          });
          console.log('✅ Updated task with report images:', reportImageIds);
        } catch (e) {
          console.warn('[issueRoutes] Failed to save report_images on task:', e?.message || e);
        }
      } catch (e) {
        console.error("[issueRoutes] GCS upload failed:", e?.message || e);
      }
    }

    if (result.noIssueDetected) {
      res.status(422).json({ ...result });
    } else if (result.success) {
      res.status(200).json({ ...result, reportImageIds, pictureIds: reportImageIds });
    } else {
      res.status(400).json({ ...result });
    }
  } catch (error) {
    console.error("Error in detect route:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get user's issues
router.get("/user/:userEmail", async (req, res) => {
  try {
    const userEmail = decodeURIComponent(req.params.userEmail);
    console.log('🔍 Fetching issues for user:', userEmail);
    
    const tasksRef = db.collection('tasks');
    
    // Debug: Check if we can access the collection
    console.log('  Accessing tasks collection...');
    
    // Try to get all tasks first to debug
    const allSnapshot = await tasksRef.limit(5).get();
    console.log('  Total tasks in collection:', allSnapshot.size);
    
    if (allSnapshot.size > 0) {
      const sampleDoc = allSnapshot.docs[0];
      const sampleData = sampleDoc.data();
      console.log('  Sample task userEmail field:', sampleData.userEmail);
      console.log('  Sample task keys:', Object.keys(sampleData));
    }
    
    // Now try the filtered query (without orderBy to avoid index requirement)
    const snapshot = await tasksRef
      .where('userEmail', '==', userEmail)
      .get();

    console.log('  Filtered query returned:', snapshot.size, 'documents');

    const issues = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      issues.push({
        id: doc.id,
        ...data,
        dateReported: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : null
      });
    });

    // Sort by createdAt in JavaScript instead
    issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log('✅ Successfully fetched', issues.length, 'issues for user:', userEmail);
    res.status(200).json({ success: true, issues });
  } catch (error) {
    console.error("❌ Error fetching user issues:", error);
    res.status(500).json({ success: false, message: "Failed to fetch issues", error: error.message });
  }
});

// Get issue by ID with detailed information
router.get("/:issueId", async (req, res) => {
  try {
    const issueId = req.params.issueId;
    console.log('Fetching issue details for:', issueId);
    
    const taskDoc = await db.collection('tasks').doc(issueId).get();
    
    if (!taskDoc.exists) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const issueData = taskDoc.data();
    
    // Get supervisor details if assigned
    let supervisorDetails = null;
    if (issueData.assigned_supervisor) {
      try {
        const supervisorDoc = await db.collection('supervisors').doc(issueData.assigned_supervisor).get();
        if (supervisorDoc.exists) {
          const supervisor = supervisorDoc.data();
          supervisorDetails = {
            name: supervisor.name,
            department: supervisor.department,
            phoneNumber: supervisor.phoneNumber,
            email: supervisor.email
          };
        }
      } catch (supervisorError) {
        console.error('Error fetching supervisor details:', supervisorError);
      }
    }

    // Get technician details if assigned
    let technicianDetails = null;
    if (issueData.assigned_technician) {
      try {
        const technicianDoc = await db.collection('technicians').doc(issueData.assigned_technician).get();
        if (technicianDoc.exists) {
          const technician = technicianDoc.data();
          technicianDetails = {
            name: technician.name,
            phoneNumber: technician.phoneNumber,
            email: technician.email
          };
        }
      } catch (technicianError) {
        console.error('Error fetching technician details:', technicianError);
      }
    }

    const detailedIssue = {
      id: issueId,
      ...issueData,
      supervisorDetails,
      technicianDetails,
      dateReported: issueData.createdAt ? new Date(issueData.createdAt).toISOString().split('T')[0] : null
    };

    res.status(200).json({ success: true, issue: detailedIssue });
  } catch (error) {
    console.error("Error fetching issue details:", error);
    res.status(500).json({ success: false, message: "Failed to fetch issue details" });
  }
});

// Get image from GCS bucket
router.get("/image/:pictureId", async (req, res) => {
  try {
    const pictureId = req.params.pictureId;
    console.log('🖼️ Fetching image:', pictureId);
    
    const bucket = getBucket();
    
    // Try different possible extensions
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    let gcsFile = null;
    let foundExtension = '';
    
    for (const ext of possibleExtensions) {
      const objectPath = `${pictureId}${ext}`;
      const testFile = bucket.file(objectPath);
      const [exists] = await testFile.exists();
      
      if (exists) {
        gcsFile = testFile;
        foundExtension = ext;
        console.log('✅ Found image at:', objectPath);
        break;
      }
    }
    
    if (!gcsFile) {
      console.log('❌ Image not found for ID:', pictureId);
      return res.status(404).json({ success: false, message: "Image not found" });
    }
    
    // Get the file's metadata to determine content type
    const [metadata] = await gcsFile.getMetadata();
    const contentType = metadata.contentType || getContentTypeFromExtension(foundExtension);
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the file directly to the response
    const stream = gcsFile.createReadStream();
    
    stream.on('error', (error) => {
      console.error('❌ Error streaming image:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Error loading image" });
      }
    });
    
    stream.pipe(res);
    
  } catch (error) {
    console.error("❌ Error fetching image:", error);
    res.status(500).json({ success: false, message: "Failed to fetch image" });
  }
});

// Update issue with initiation images (when supervisor starts work)
router.post("/initiate/:taskId", upload.any(), async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const incomingFiles = Array.isArray(req.files) && req.files.length > 0 ? req.files : [];
    
    console.log('🚀 Adding initiation images for task:', taskId);
    
    let initiationImageIds = [];
    if (incomingFiles.length > 0) {
      const bucket = getBucket();
      const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg", 
        "image/png": ".png",
        "image/webp": ".webp",
        "image/heic": ".heic"
      };

      for (const f of incomingFiles) {
        const ext = mimeToExt[f.mimetype] || path.extname(f.originalname) || ".jpg";
        const pictureId = crypto.randomUUID ? crypto.randomUUID() : crypto.createHash("sha1").update(f.buffer).digest("hex");
        const objectPath = `${pictureId}${ext}`;
        const gcsFile = bucket.file(objectPath);

        await gcsFile.save(f.buffer, {
          contentType: f.mimetype || "application/octet-stream",
          resumable: false,
          metadata: { cacheControl: "public, max-age=31536000" }
        });
        
        initiationImageIds.push(pictureId);
        console.log(`✅ Uploaded initiation image: ${objectPath}`);
      }
    }

    // Update task with initiation images and status
    await db.collection('tasks').doc(taskId).update({
      initiation_images: initiationImageIds,
      status: 'ongoing',
      initiatedAt: new Date().toISOString()
    });

    res.status(200).json({ 
      success: true, 
      message: "Issue initiation recorded successfully",
      initiationImageIds 
    });

  } catch (error) {
    console.error("❌ Error updating initiation images:", error);
    res.status(500).json({ success: false, message: "Failed to record initiation" });
  }
});

// Update issue with finished images (when work is completed)
router.post("/complete/:taskId", upload.any(), async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const incomingFiles = Array.isArray(req.files) && req.files.length > 0 ? req.files : [];
    
    console.log('✅ Adding completion images for task:', taskId);
    
    let finishedImageIds = [];
    if (incomingFiles.length > 0) {
      const bucket = getBucket();
      const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png", 
        "image/webp": ".webp",
        "image/heic": ".heic"
      };

      for (const f of incomingFiles) {
        const ext = mimeToExt[f.mimetype] || path.extname(f.originalname) || ".jpg";
        const pictureId = crypto.randomUUID ? crypto.randomUUID() : crypto.createHash("sha1").update(f.buffer).digest("hex");
        const objectPath = `${pictureId}${ext}`;
        const gcsFile = bucket.file(objectPath);

        await gcsFile.save(f.buffer, {
          contentType: f.mimetype || "application/octet-stream",
          resumable: false,
          metadata: { cacheControl: "public, max-age=31536000" }
        });
        
        finishedImageIds.push(pictureId);
        console.log(`✅ Uploaded completion image: ${objectPath}`);
      }
    }

    // Update task with completion images and status
    await db.collection('tasks').doc(taskId).update({
      finished_images: finishedImageIds,
      status: 'completed',
      completedAt: new Date().toISOString()
    });

    res.status(200).json({ 
      success: true, 
      message: "Issue completion recorded successfully",
      finishedImageIds 
    });

  } catch (error) {
    console.error("❌ Error updating completion images:", error);
    res.status(500).json({ success: false, message: "Failed to record completion" });
  }
});

// Update issue with bill images
router.post("/bills/:taskId", upload.any(), async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const incomingFiles = Array.isArray(req.files) && req.files.length > 0 ? req.files : [];
    
    console.log('💰 Adding bill images for task:', taskId);
    
    let billImageIds = [];
    if (incomingFiles.length > 0) {
      const bucket = getBucket();
      const mimeToExt = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp", 
        "image/heic": ".heic"
      };

      for (const f of incomingFiles) {
        const ext = mimeToExt[f.mimetype] || path.extname(f.originalname) || ".jpg";
        const pictureId = crypto.randomUUID ? crypto.randomUUID() : crypto.createHash("sha1").update(f.buffer).digest("hex");
        const objectPath = `${pictureId}${ext}`;
        const gcsFile = bucket.file(objectPath);

        await gcsFile.save(f.buffer, {
          contentType: f.mimetype || "application/octet-stream",
          resumable: false,
          metadata: { cacheControl: "public, max-age=31536000" }
        });
        
        billImageIds.push(pictureId);
        console.log(`✅ Uploaded bill image: ${objectPath}`);
      }
    }

    // Update task with bill images
    await db.collection('tasks').doc(taskId).update({
      bill_images: billImageIds,
      billsUploadedAt: new Date().toISOString()
    });

    res.status(200).json({ 
      success: true, 
      message: "Bill images uploaded successfully",
      billImageIds 
    });

  } catch (error) {
    console.error("❌ Error updating bill images:", error);
    res.status(500).json({ success: false, message: "Failed to upload bills" });
  }
});

// Helper function to get content type from extension
function getContentTypeFromExtension(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic'
  };
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

module.exports = router;