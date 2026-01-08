require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testCorrectModel() {
    console.log('=== Testing Correct Fal AI Model ===');
    console.log('Model: fal-ai/playai/tts/v3');
    console.log('');

    const requestBody = {
        input: 'This is a test speech generation',
        voice: 'Jennifer (English (US)/American)'
    };

    console.log('Request:', JSON.stringify(requestBody, null, 2));
    console.log('');

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

        console.log('=== SUCCESS ===');
        console.log('Status:', response.status);
        console.log('Audio URL:', response.data.audio.url);
        console.log('Duration:', response.data.audio.duration);
        return { success: true, audioUrl: response.data.audio.url };

    } catch (error) {
        console.log('=== ERROR ===');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
        return { success: false, error: error.message };
    }
}

testCorrectModel();
