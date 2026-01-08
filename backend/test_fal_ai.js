require('dotenv').config();
const { generateSpeech } = require('./generators/speech');

(async () => {
    console.log('=== Testing Fal AI Speech Generation ===');
    console.log('Voice: af_sarah');
    console.log('Model: fal-ai/playht/tts/v3');
    console.log('FAL_KEY exists:', !!process.env.FAL_KEY);
    console.log('FAL_KEY format:', process.env.FAL_KEY ? process.env.FAL_KEY.substring(0, 10) + '...' : 'N/A');
    console.log('');

    try {
        const result = await generateSpeech(
            'Testing Fal AI speech generation with voice af_sarah',
            'af_sarah',
            'fal-ai/playht/tts/v3',
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
        console.error('Details:', error);
    }
})();
