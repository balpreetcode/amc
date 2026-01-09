/**
 * Cloudflare R2 Storage Utility
 * Handles uploading files to R2 for persistent storage
 */

const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// R2 Configuration from environment
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://56e8953a9402819ab8bc95afb7d9252c.r2.cloudflarestorage.com';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'workflow-outputs';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || R2_ENDPOINT;

let s3Client = null;

/**
 * Initialize S3 client for R2
 */
function getS3Client() {
    if (s3Client) return s3Client;

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        console.warn('[R2 Storage] Missing R2 credentials. R2 uploads will be disabled.');
        return null;
    }

    s3Client = new S3Client({
        region: 'auto',
        endpoint: R2_ENDPOINT,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY
        }
    });

    return s3Client;
}

/**
 * Check if R2 is configured and available
 */
function isR2Configured() {
    return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Upload base64 encoded content to R2
 * @param {string} base64Data - Base64 encoded content (without data URL prefix)
 * @param {string} filename - Desired filename (without extension)
 * @param {string} contentType - MIME type (e.g., 'image/png')
 * @returns {Promise<string>} Public URL of uploaded file
 */
async function uploadBase64ToR2(base64Data, filename, contentType) {
    const client = getS3Client();
    if (!client) {
        throw new Error('R2 storage is not configured');
    }

    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');

    // Generate unique key
    const extension = contentType.split('/')[1] || 'bin';
    const key = `${filename}_${uuidv4()}.${extension}`;

    console.log(`[R2 Storage] Uploading ${buffer.length} bytes as ${key}`);

    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    console.log(`[R2 Storage] Uploaded: ${publicUrl}`);

    return publicUrl;
}

/**
 * Upload buffer to R2
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Desired filename (without extension)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
async function uploadToR2(buffer, filename, contentType) {
    const client = getS3Client();
    if (!client) {
        throw new Error('R2 storage is not configured');
    }

    // Generate unique key
    let extension = contentType.split('/')[1] || 'bin';
    if (contentType === 'audio/mpeg') {
        extension = 'mp3';
    }
    const key = `${filename}_${uuidv4()}.${extension}`;

    console.log(`[R2 Storage] Uploading ${buffer.length} bytes as ${key}`);

    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    console.log(`[R2 Storage] Uploaded: ${publicUrl}`);

    return publicUrl;
}

/**
 * Upload file from URL to R2 (download and re-upload)
 * @param {string} sourceUrl - URL to download from
 * @param {string} filename - Desired filename
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
async function uploadUrlToR2(sourceUrl, filename, contentType) {
    const axios = require('axios');

    console.log(`[R2 Storage] Downloading from: ${sourceUrl}`);

    const response = await axios.get(sourceUrl, {
        responseType: 'arraybuffer'
    });

    return uploadToR2(Buffer.from(response.data), filename, contentType);
}

/**
 * Get content type from file extension
 */
function getContentType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
    };
    return types[ext] || 'application/octet-stream';
}

module.exports = {
    isR2Configured,
    uploadBase64ToR2,
    uploadToR2,
    uploadUrlToR2,
    getContentType
};
