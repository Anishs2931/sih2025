const express = require("express");
const multer = require("multer");
const upload = multer();
const { detect } = require("../issue/detectIssue");

const router = express.Router();

router.post("/detect", upload.single("image"), async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;
    let { location, floor, sector, instructions } = req.body;
    const result = await detect(imageBuffer, { location, floor, sector, instructions });

    if (result.noIssueDetected) {
      res.status(422).json(result);
    } else if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Assignment error:", error);
    res.status(500).json({ error: "Assignment failed" });
  }
});

module.exports = router;