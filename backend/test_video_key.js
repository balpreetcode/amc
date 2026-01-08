require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testVideoAPI() {
    console.log('=== Testing Video Generation (should work) ===');

    const requestBody = {
        prompt: 'A cat sitting on a table',
        aspect_ratio: '16:9'
    };

    try {
        const response = await axios.post(
            'https://fal.run/fal-ai/fast-svd',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        console.log('Video SUCCESS - Status:', response.status);
        return true;

    } catch (error) {
        console.log('Video FAILED - Status:', error.response?.status);
        console.log('Error:', error.response?.data?.detail || error.message);
        return false;
    }
}

async function testTTSAPI() {
    console.log('\n=== Testing TTS API (currently failing) ===');

    const requestBody = {
        input: 'Test speech',
        voice: 'Jennifer (English (US)/American)'
    };

    try {
        const response = await axios.post(
            'https://fal.run/fal-ai/playai/tts/v3',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        console.log('TTS SUCCESS - Status:', response.status);
        console.log('Audio:', response.data.audio?.url);
        return true;

    } catch (error) {
        console.log('TTS FAILED - Status:', error.response?.status);
        console.log('Error:', error.response?.data?.detail || error.message);
        return false;
    }
}

async function runTests() {
    const videoWorks = await testVideoAPI();
    const ttsWorks = await testTTSAPI();

    console.log('\n=== SUMMARY ===');
    console.log('Video generation works:', videoWorks);
    console.log('TTS generation works:', ttsWorks);

    if (videoWorks && !ttsWorks) {
        console.log('\n⚠️  Your FAL_KEY works for video but NOT for TTS!');
        console.log('Possible reasons:');
        console.log('1. TTS model requires different permissions');
        console.log('2. TTS model is in a different tier/subscription');
        console.log('3. TTS model API endpoint is different');
    }
}

runTests();
