require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testFalAIDirectly() {
    console.log('=== Testing Fal AI Direct API Call ===');
    console.log('FAL_KEY exists:', !!FAL_API_KEY);
    console.log('FAL_KEY format:', FAL_API_KEY ? FAL_API_KEY.substring(0, 15) + '...' : 'N/A');
    console.log('');

    const requestBody = {
        input: 'Testing speech generation',
        voice: 'af_sarah',
        output_format: 'mp3'
    };

    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('');

    try {
        const response = await axios.post(
            'https://fal.run/fal-ai/playht/tts/v3',
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

    } catch (error) {
        console.log('=== ERROR ===');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.data) {
            console.log('');
            console.log('Full error details:', error.response.data);
        }
    }
}

testFalAIDirectly();
