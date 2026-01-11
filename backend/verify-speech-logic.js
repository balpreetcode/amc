require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { generateSpeech } = require('./generators/speech');

async function verify() {
    console.log('Running TTS verification...');
    try {
        const result = await generateSpeech('Verification test.', 'aaron', 'fal-ai/chatterbox/text-to-speech/turbo', true);
        console.log('Verification SUCCESS!');
        console.log('Audio URL:', result.result);
        console.log('Provider:', result.apiCall.request.provider);
    } catch (err) {
        console.error('Verification FAILED:', err.message);
    }
}

verify();
