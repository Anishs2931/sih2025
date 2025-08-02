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
    res.json(result);
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

module.exports = router;