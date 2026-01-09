const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const FOLDER = 'workflow_videos';

/**
 * Upload a video file to Cloudinary
 * @param {string} filePath - Local path to video file
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result with public_id, url, metadata
 */
async function uploadVideo(filePath, options = {}) {
  const uploadOptions = {
    resource_type: 'video',
    folder: FOLDER,
    overwrite: true,
    ...options
  };

  const result = await cloudinary.uploader.upload(filePath, uploadOptions);

  return {
    publicId: result.public_id,
    cloudinaryUrl: result.secure_url,
    originalFilename: options.originalFilename || result.original_filename,
    duration: result.duration,
    fileSize: result.bytes,
    width: result.width,
    height: result.height,
    format: result.format,
    createdAt: result.created_at || new Date().toISOString()
  };
}

/**
 * Delete a video from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<object>} Delete result
 */
async function deleteVideo(publicId) {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'video',
    invalidate: true
  });

  return {
    success: result.result === 'ok' || result.deleted?.[publicId] === 'deleted',
    message: result.result === 'ok' ? 'Video deleted successfully' : 'Video not found or already deleted',
    result
  };
}

/**
 * List all videos from Cloudinary
 * @param {object} options - List options
 * @returns {Promise<object>} List of videos
 */
async function listVideos(options = {}) {
  const { max_results = 50, next_cursor = null, prefix = FOLDER } = options;

  const listOptions = {
    type: 'upload',
    resource_type: 'video',
    prefix,
    max_results,
  };

  if (next_cursor) {
    listOptions.next_cursor = next_cursor;
  }

  const result = await cloudinary.api.resources(listOptions);

  const videos = result.resources.map(resource => {
    // Cloudinary returns created_at as a string or timestamp
    let createdAt = new Date().toISOString();
    if (resource.created_at) {
      if (typeof resource.created_at === 'number') {
        createdAt = new Date(resource.created_at * 1000).toISOString();
      } else {
        createdAt = new Date(resource.created_at).toISOString();
      }
    }
    return {
      id: resource.public_id,
      publicId: resource.public_id,
      cloudinaryUrl: resource.secure_url,
      originalFilename: resource.public_id.split('/').pop(),
      duration: resource.duration,
      fileSize: resource.bytes,
      width: resource.width,
      height: resource.height,
      format: resource.format,
      createdAt,
      status: 'active'
    };
  });

  return {
    videos,
    total: result.total_count || videos.length,
    nextCursor: result.next_cursor
  };
}

/**
 * Get video metadata from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<object>} Video metadata
 */
async function getVideoMetadata(publicId) {
  const resources = await cloudinary.api.resources_by_ids(publicId, {
    resource_type: 'video'
  });

  if (!resources || resources.length === 0) {
    throw new Error('Video not found');
  }

  const resource = resources[0];

  // Handle date parsing
  let createdAt = new Date().toISOString();
  if (resource.created_at) {
    if (typeof resource.created_at === 'number') {
      createdAt = new Date(resource.created_at * 1000).toISOString();
    } else {
      createdAt = new Date(resource.created_at).toISOString();
    }
  }

  return {
    publicId: resource.public_id,
    cloudinaryUrl: resource.secure_url,
    duration: resource.duration,
    fileSize: resource.bytes,
    width: resource.width,
    height: resource.height,
    format: resource.format,
    createdAt
  };
}

/**
 * Check if Cloudinary is configured and accessible
 * @returns {Promise<boolean>}
 */
async function checkConfiguration() {
  try {
    await cloudinary.api.ping();
    return true;
  } catch (error) {
    console.error('Cloudinary configuration error:', error.message);
    return false;
  }
}

module.exports = {
  uploadVideo,
  deleteVideo,
  listVideos,
  getVideoMetadata,
  checkConfiguration,
  FOLDER
};
