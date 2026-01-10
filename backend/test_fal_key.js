// This must be run from /home/usr2/code/backend directory
require('dotenv').config();

// Check what .env file was loaded
const path = require('path');
const fs = require('fs');

console.log('Current directory:', process.cwd());
console.log('.env file exists:', fs.existsSync('.env') ? 'YES' : 'NO');
console.log('FAL_KEY:', process.env.FAL_KEY ? 'PRESENT (first 10 chars: ' + process.env.FAL_KEY.substring(0, 10) + ')' : 'MISSING');

// Now try to load speech module
try {
    const speech = require('./generators/speech');
    console.log('Speech module loaded successfully');
    
    // Check if FAL_KEY is accessible from the module
    console.log('Checking FAL_API_KEY from speech.js context...');
    // We can't directly access FAL_API_KEY as it's module-scoped, but we can test by calling generateSpeech
} catch (e) {
    console.error('Error loading speech module:', e.message);
}
