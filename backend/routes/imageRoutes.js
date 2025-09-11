const express = require('express');
const { getBucket } = require('../gcs');
const router = express.Router();

// Get image by ID
router.get('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    if (!imageId) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    console.log(`[imageRoutes] Fetching image: ${imageId}`);
    
    const bucket = getBucket();
    
    // Try different possible file extensions
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp', ''];
    let file = null;
    let foundExtension = null;
    
    for (const ext of possibleExtensions) {
      const testFile = bucket.file(`${imageId}${ext}`);
      const [exists] = await testFile.exists();
      if (exists) {
        file = testFile;
        foundExtension = ext;
        break;
      }
    }
    
    if (!file) {
      console.log(`[imageRoutes] Image not found with any extension: ${imageId}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log(`[imageRoutes] Found image: ${imageId}${foundExtension}`);

    // Set appropriate headers - determine content type from extension
    const contentType = foundExtension === '.png' ? 'image/png' : 
                       foundExtension === '.jpg' || foundExtension === '.jpeg' ? 'image/jpeg' :
                       foundExtension === '.webp' ? 'image/webp' : 'image/jpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the file
    const stream = file.createReadStream();
    
    stream.on('error', (err) => {
      console.error(`[imageRoutes] Error streaming image ${imageId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to load image' });
      }
    });

    stream.pipe(res);
    
  } catch (error) {
    console.error('[imageRoutes] Error fetching image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get image metadata
router.get('/:imageId/info', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    if (!imageId) {
      return res.status(400).json({ error: 'Image ID is required' });
    }

    const bucket = getBucket();
    
    // Try different possible file extensions
    const possibleExtensions = ['.png', '.jpg', '.jpeg', '.webp', ''];
    let file = null;
    
    for (const ext of possibleExtensions) {
      const testFile = bucket.file(`${imageId}${ext}`);
      const [exists] = await testFile.exists();
      if (exists) {
        file = testFile;
        break;
      }
    }
    
    if (!file) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const [metadata] = await file.getMetadata();
    
    res.json({
      id: imageId,
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      updated: metadata.updated
    });
    
  } catch (error) {
    console.error('[imageRoutes] Error fetching image metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
