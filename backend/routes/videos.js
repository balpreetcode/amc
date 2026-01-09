const express = require('express');
const router = express.Router();
const cloudinaryService = require('../services/cloudinary');

/**
 * GET /videos
 * List all videos from Cloudinary
 * Query params: ?page=1&pageSize=20
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    // Cloudinary doesn't support pagination in the traditional sense
    // We fetch all and can paginate locally if needed
    const result = await cloudinaryService.listVideos({
      max_results: pageSize
    });

    res.json({
      videos: result.videos,
      total: result.total,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      error: 'Failed to fetch videos',
      message: error.message
    });
  }
});

/**
 * GET /videos/:publicId
 * Get a single video's metadata
 */
router.get('/:publicId(*)', async (req, res) => {
  try {
    const { publicId } = req.params;
    const video = await cloudinaryService.getVideoMetadata(publicId);
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(404).json({
      error: 'Video not found',
      message: error.message
    });
  }
});

/**
 * DELETE /videos/:publicId
 * Delete a video from Cloudinary
 */
router.delete('/:publicId(*)', async (req, res) => {
  try {
    const { publicId } = req.params;

    // Validate publicId (prevent directory traversal)
    if (publicId.includes('..')) {
      return res.status(400).json({
        error: 'Invalid public ID',
        message: 'The public ID format is invalid'
      });
    }

    const result = await cloudinaryService.deleteVideo(publicId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(404).json({
        error: 'Video not found',
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      error: 'Failed to delete video',
      message: error.message
    });
  }
});

/**
 * POST /videos/upload
 * Upload a video file (for testing purposes)
 * Body: { filename: 'video.mp4' }
 */
router.post('/upload', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: 'Filename is required',
        message: 'Please provide a filename in the request body'
      });
    }

    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '../output', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: `The file ${filename} was not found in the output directory`
      });
    }

    const result = await cloudinaryService.uploadVideo(filePath, {
      originalFilename: filename
    });

    res.json(result);
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({
      error: 'Failed to upload video',
      message: error.message
    });
  }
});

module.exports = router;
