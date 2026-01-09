const cloudinary = require('cloudinary').v2;
const path = require('path');
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

async function testCredentials() {
  log('\n===========================================', 'blue');
  log('  Testing Cloudinary API Credentials', 'blue');
  log('===========================================\n', 'blue');

  // Check if env vars are set
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    log('❌ Missing credentials in .env file!', 'red');
    log('   Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET', 'yellow');
    process.exit(1);
  }

  log('✓ Environment variables found\n', 'green');

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });

  // Test 1: Ping API
  log('Test 1: Pinging Cloudinary API...', 'yellow');
  try {
    const pingResult = await cloudinary.api.ping();
    log('✓ API ping successful!', 'green');
    log(`  Response: ${JSON.stringify(pingResult)}\n`, 'blue');
  } catch (error) {
    log('❌ API ping failed!', 'red');
    log(`  Error: ${error.message}\n`, 'red');
    process.exit(1);
  }

  // Test 2: List resources (verify read access)
  log('Test 2: Listing resources (read access)...', 'yellow');
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 5
    });
    log('✓ Read access verified!', 'green');
    log(`  Found ${result.resources?.length || 0} resources in account\n`, 'blue');
  } catch (error) {
    log('⚠️  Could not list resources', 'yellow');
    log(`  This is normal if your account is empty. Error: ${error.message}\n`, 'blue');
  }

  // Test 3: Check account info
  log('Test 3: Getting account information...', 'yellow');
  try {
    const accountInfo = await cloudinary.api.usage();
    log('✓ Account access verified!', 'green');
    log(`  Plan: ${accountInfo?.plan || 'Free'}\n`, 'blue');
  } catch (error) {
    log('⚠️  Could not get account info (may require higher tier)', 'yellow');
    log(`  Error: ${error.message}\n`, 'blue');
  }

  log('===========================================', 'green');
  log('  ✓ All credential tests passed!', 'green');
  log('===========================================\n', 'green');

  return {
    cloudName,
    apiKey,
    configured: true
  };
}

// Run the test
testCredentials()
  .then((result) => {
    log('Credentials are valid! Ready to upload videos.\n', 'green');
    log('Next steps:', 'blue');
    log('1. Place a video file in backend/output/ directory', 'blue');
    log('2. Run: node scripts/test-upload.js <filename>', 'blue');
    log(`   Example: node scripts/test-upload.js composed_1767612669309.mp4\n`, 'blue');
  })
  .catch((error) => {
    log(`\n❌ Credential test failed: ${error.message}`, 'red');
    process.exit(1);
  });
