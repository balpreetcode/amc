require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testChatterbox() {
    console.log('Testing Fal AI Chatterbox TTS...');
    console.log('FAL_API_KEY:', FAL_API_KEY ? 'SET (' + FAL_API_KEY.substring(0, 10) + '...)' : 'NOT SET');

    const model = 'fal-ai/chatterbox/text-to-speech/turbo';
    const requestBody = { text: 'Hello, this is a test.', language: 'en' };

    const headers = {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
    };

    // Try synchronous API first
    console.log('\n--- Testing SYNC API (fal.run) ---');
    try {
        const response = await axios.post(
            `https://fal.run/${model}`,
            requestBody,
            { headers, timeout: 120000 }
        );
        console.log('SUCCESS! Sync API response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('FAILED! Sync API error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }

    // Now try queue API
    console.log('\n--- Testing ASYNC API (queue.fal.run) ---');
    try {
        const queueResponse = await axios.post(
            `https://queue.fal.run/${model}`,
            requestBody,
            { headers, timeout: 30000 }
        );

        console.log('Queue response:', JSON.stringify(queueResponse.data, null, 2));

        const { request_id, status_url, response_url } = queueResponse.data;
        console.log(`Queued with request_id: ${request_id}`);

        // Poll for completion
        let attempts = 0;
        while (attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            try {
                const statusRes = await axios.get(status_url, { headers, timeout: 10000 });
                const { status } = statusRes.data;
                console.log(`Status (attempt ${attempts}): ${status}`);

                if (status === 'COMPLETED') {
                    const resultRes = await axios.get(response_url, { headers, timeout: 30000 });
                    console.log('SUCCESS! Async API result:', JSON.stringify(resultRes.data, null, 2));
                    return;
                }

                if (status === 'FAILED') {
                    console.log('FAILED! Status data:', JSON.stringify(statusRes.data, null, 2));
                    return;
                }
            } catch (err) {
                if (err.response?.status !== 202) {
                    console.log('Polling error:', err.message);
                }
            }
        }
        console.log('Timed out waiting for async result');
    } catch (error) {
        console.log('FAILED! Async API error:', error.message);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
    }
}

testChatterbox();
