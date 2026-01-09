const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function uploadVideo(filename) {
  log('\n===========================================', 'blue');
  log('  Cloudinary Video Upload Test', 'blue');
  log('===========================================\n', 'blue');

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  const filePath = path.join(__dirname, '../output', filename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    log(`❌ File not found: ${filePath}`, 'red');
    log(`\nAvailable files in output directory:`, 'yellow');
    const outputDir = path.join(__dirname, '../output');
    const files = fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
    files.filter(f => f.endsWith('.mp4')).forEach(f => log(`  - ${f}`, 'blue'));
    process.exit(1);
  }

  const fileStats = fs.statSync(filePath);
  log(`📁 File: ${filename}`, 'blue');
  log(`📏 Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n`, 'blue');

  log('Uploading to Cloudinary...', 'yellow');

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'workflow_videos',
      public_id: `test_${Date.now()}_${path.parse(filename).name}`,
      overwrite: true,
      eager: [
        { streaming_profile: 'full_hd', format: 'm3u8' }
      ]
    });

    log('\n===========================================', 'green');
    log('  ✓ Upload Successful!', 'green');
    log('===========================================\n', 'green');

    log('Video Details:', 'blue');
    log(`  Public ID:    ${result.public_id}`, 'blue');
    log(`  URL:          ${result.secure_url}`, 'blue');
    log(`  Duration:     ${result.duration?.toFixed(2)}s`, 'blue');
    log(`  Format:       ${result.format}`, 'blue');
    log(`  Width:        ${result.width}px`, 'blue');
    log(`  Height:       ${result.height}px`, 'blue');
    log(`  Size:         ${(result.bytes / 1024 / 1024).toFixed(2)} MB\n`, 'blue');

    log('Test URLs:', 'yellow');
    log(`  Video:        ${result.secure_url}`, 'blue');
    log(`  Thumbnail:    ${result.secure_url.replace('.mp4', '.jpg')}`, 'blue');
    log(`\n✓ You can now test the frontend Videos page!\n`, 'green');

    // Save to local JSON for reference
    const uploadRecord = {
      publicId: result.public_id,
      cloudinaryUrl: result.secure_url,
      originalFilename: filename,
      duration: result.duration,
      fileSize: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
      createdAt: new Date().toISOString()
    };

    const recordsPath = path.join(__dirname, '../temp/uploaded-videos.json');
    let records = [];
    if (fs.existsSync(recordsPath)) {
      records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    }
    records.push(uploadRecord);
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    log(`Record saved to: ${recordsPath}`, 'blue');

    return uploadRecord;

  } catch (error) {
    log('\n❌ Upload failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.http_code) {
      log(`HTTP Code: ${error.http_code}`, 'red');
    }
    if (error.error?.message) {
      log(`Cloudinary Error: ${error.error.message}`, 'red');
    }
    process.exit(1);
  }
}

// Get filename from command line or use default
const filename = process.argv[2] || 'composed_1767612669309.mp4';
uploadVideo(filename);
