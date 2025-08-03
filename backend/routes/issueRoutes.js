const express = require("express");
const multer = require("multer");
const upload = multer();
const { detect } = require("../issue/detectIssue");

const router = express.Router();

router.post("/detect", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;
    let { location, floor, sector, instructions } = req.body;
    // If location is a stringified object, keep as string for detect
    // Pass all fields to detect as received
    const result = await detect(imageBuffer, { location, floor, sector, instructions });

    // Return appropriate HTTP status based on result
    if (result.noIssueDetected) {
      // Return 422 (Unprocessable Entity) for no issue detected
      res.status(422).json(result);
    } else if (result.success) {
      // Return 200 for successful issue creation
      res.status(200).json(result);
    } else {
      // Return 400 for other failures
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

module.exports = router;