const { generateSpeech } = require('./generators/speech');

async function test() {
    console.log('Testing Fal AI Chatterbox Turbo with current backend...');
    console.log('');
    
    try {
        const result = await generateSpeech(
            'Test message for debugging',
            'af_bella',
            'fal-ai/chatterbox/text-to-speech/turbo',
            true,
            'English'
        );
        console.log('');
        console.log('=== SUCCESS ===');
        console.log('Result:', result.result ? 'GOT URL' : 'NO URL');
        console.log('Provider:', result.apiCall?.request?.provider);
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

test();
