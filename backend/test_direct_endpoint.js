require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testDirectEndpoint() {
    console.log('=== Testing Direct fal.run Endpoint (Synchronous) ===');

    const requestBody = {
        input: 'This is a test using the direct endpoint',
        voice: 'Jennifer (English (US)/American)'
    };

    console.log('Request:', JSON.stringify(requestBody, null, 2));
    console.log('');

    try {
        // Use fal.run directly (not queue.fal.run) - this should be synchronous
        const response = await axios.post(
            'https://fal.run/fal-ai/playai/tts/v3',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minutes for sync processing
            }
        );

        console.log('=== SUCCESS ===');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        console.log('');
        console.log('Audio URL:', response.data.audio?.url);

    } catch (error) {
        console.log('=== ERROR ===');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    }
}

testDirectEndpoint();
