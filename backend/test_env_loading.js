// Test if dotenv loads before speech.js
console.log('Step 1: Current directory:', process.cwd());
console.log('Step 2: FAL_KEY before dotenv:', process.env.FAL_KEY ? 'PRESENT' : 'MISSING');

require('dotenv').config();
console.log('Step 3: FAL_KEY after dotenv:', process.env.FAL_KEY ? 'PRESENT' : 'MISSING');

const { generateSpeech } = require('./generators/speech');
console.log('Step 4: speech.js loaded');

// Try to call generateSpeech
generateSpeech('Test', 'nova', 'fal-ai/chatterbox/text-to-speech/turbo', false, 'English')
  .then(result => console.log('Step 5: SUCCESS -', result.substring(0, 50)))
  .catch(err => console.error('Step 5: FAILED -', err.message));
