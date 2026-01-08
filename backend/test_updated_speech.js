require('dotenv').config();
const { generateSpeech } = require('./generators/speech');

(async () => {
    console.log('=== Testing Updated Fal AI Speech Generation ===');
    console.log('Model: fal-ai/playai/tts/v3');
    console.log('Voice: Jennifer (English (US)/American)');
    console.log('FAL_KEY:', process.env.FAL_KEY ? process.env.FAL_KEY.substring(0, 20) + '...' + process.env.FAL_KEY.substring(process.env.FAL_KEY.length - 10) : 'MISSING');
    console.log('');

    try {
        const result = await generateSpeech(
            'This is a test of Fal AI speech generation with the updated code',
            'Jennifer (English (US)/American)',
            'fal-ai/playai/tts/v3',
            true,
            'English'
        );

        if (result.apiCall) {
            const request = result.apiCall.request;

            console.log('=== RESULT ===');
            console.log('Provider:', request.provider);
            console.log('Model:', request.model);
            console.log('Voice:', request.voice);
            console.log('Fallback:', request.fallback || false);

            if (request.fallback) {
                console.log('Fallback Reason:', request.fallbackReason);
            }

            console.log('');
            console.log('Audio URL:', result.result);

            if (result.result.includes('fal') || result.result.startsWith('http')) {
                console.log('');
                console.log('*** SUCCESS: Fal AI worked without fallback! ***');
            } else if (result.result.includes('openai')) {
                console.log('');
                console.log('*** Fallback: Used OpenAI instead of Fal AI ***');
            }
        }
    } catch (error) {
        console.error('ERROR:', error.message);
    }
})();
