// Add debugging to speech.js
const fs = require('fs');
const speechCode = fs.readFileSync('./generators/speech.js', 'utf8');

// Find where FAL_API_KEY is defined
const match = speechCode.match(/const FAL_API_KEY = process\.env\.FAL_KEY;/);
if (match) {
    console.log('Found: const FAL_API_KEY = process.env.FAL_KEY;');
} else {
    console.log('NOT FOUND!');
}
