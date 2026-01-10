const { generateSpeech } = require('./generators/speech');

async function test() {
    console.log('Testing Fal AI Chatterbox Turbo...');
    console.log('');
    
    try {
        const result = await generateSpeech(
            'Hello test',
            'af_bella',
            'fal-ai/chatterbox/text-to-speech/turbo',
            true,
            'English'
        );
        console.log('');
        console.log('SUCCESS!');
        console.log('Result:', result.result);
        console.log('API Call:', JSON.stringify(result.apiCall.request, null, 2));
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error(error.stack);
    }
}

test();
