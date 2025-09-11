const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getBucket } = require('../gcs');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

// General image upload endpoint
router.post('/', upload.single('image'), async (req, res) => {
    try {
        console.log('📸 Upload request received');
        console.log('Headers:', req.headers);
        console.log('File info:', req.file ? {
            fieldname: req.file.fieldname,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file');

        if (!req.file) {
            console.log('❌ No image file provided');
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Generate unique image ID
        const imageId = uuidv4();
        const fileExtension = path.extname(req.file.originalname) || '.jpg';
        const fileName = `${imageId}${fileExtension}`;
        
        console.log(`📤 Uploading to GCS: ${fileName}`);
        
        // Get bucket and upload to Google Cloud Storage
        const bucket = getBucket();
        const file = bucket.file(fileName);
        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        return new Promise((resolve, reject) => {
            stream.on('error', (err) => {
                console.error('❌ Upload error:', err);
                reject(err);
            });

            stream.on('finish', () => {
                console.log(`✅ Uploaded image: ${fileName}`);
                resolve();
            });

            stream.end(req.file.buffer);
        }).then(() => {
            res.json({
                success: true,
                imageId: imageId,
                fileName: fileName,
                message: 'Image uploaded successfully'
            });
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

module.exports = router;
