const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadToR2, isR2Configured } = require('../utils/r2Storage');
const fs = require('fs');
const path = require('path');

// Configure multer for memory storage if R2 is used, or disk storage if not?
// For R2, memory storage is easiest as we need the buffer.
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Upload] Received file: ${req.file.originalname} (${req.file.size} bytes)`);

        if (isR2Configured()) {
            console.log('[Upload] Uploading to R2...');
            const url = await uploadToR2(
                req.file.buffer,
                `upload_${Date.now()}_${req.file.originalname}`,
                req.file.mimetype
            );
            console.log('[Upload] Upload successful:', url);
            return res.json({ url });
        } else {
            console.log('[Upload] R2 not configured, saving locally...');
            // Fallback to local storage in 'output' directory
            const outputDir = path.join(__dirname, '..', 'output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filename = `upload_${Date.now()}_${req.file.originalname}`;
            const filepath = path.join(outputDir, filename);

            fs.writeFileSync(filepath, req.file.buffer);

            // Construct local URL
            // Assuming API_BASE_URL is available or relative path can be used
            const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`;
            const url = `${baseUrl}/output/${filename}`;

            console.log('[Upload] Saved locally:', url);
            return res.json({ url });
        }

    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
    }
});

module.exports = router;
