require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testWithQueueEndpoint() {
    console.log('=== Testing TTS with queue.fal.run endpoint ===');
    console.log('FAL_KEY:', FAL_API_KEY.substring(0, 20) + '...' + FAL_API_KEY.substring(FAL_API_KEY.length - 10));
    console.log('');

    const requestBody = {
        input: 'This is a test speech generation',
        voice: 'Jennifer (English (US)/American)'
    };

    console.log('Testing: https://queue.fal.run/fal-ai/playai/tts/v3');
    console.log('Request:', JSON.stringify(requestBody, null, 2));
    console.log('');

    try {
        const response = await axios.post(
            'https://queue.fal.run/fal-ai/playai/tts/v3',
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
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };

    } catch (error) {
        console.log('=== ERROR ===');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
        return { success: false, error: error.response?.data };
    }
}

testWithQueueEndpoint();
