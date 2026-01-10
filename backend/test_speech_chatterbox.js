require('dotenv').config();
const { generateSpeech } = require('./generators/speech');

(async () => {
  try {
    console.log('Testing fal-ai/chatterbox/text-to-speech/turbo...');
    console.log('FAL_KEY present:', process.env.FAL_KEY ? 'YES' : 'NO');

    const result = await generateSpeech(
      'As Mia lifted the locket from its resting place, a quiet truth revealed itself.',
      'aaron',
      'fal-ai/chatterbox/text-to-speech/turbo',
      true,
      'English'
    );

    console.log('\n=== SUCCESS ===');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
})();
