require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testQueueToResult() {
    console.log('=== Testing Full Queue Flow ===\n');

    const requestBody = {
        input: 'Testing speech with queue endpoint',
        voice: 'Jennifer (English (US)/American)'
    };

    console.log('Step 1: Submit to queue');
    console.log('Request:', JSON.stringify(requestBody, null, 2));

    try {
        // Submit to queue
        const queueResponse = await axios.post(
            'https://queue.fal.run/fal-ai/playai/tts/v3',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        console.log('\n✓ Queue submission successful!');
        console.log('Queue Response:', JSON.stringify(queueResponse.data, null, 2));

        const { request_id, status_url, response_url } = queueResponse.data;

        console.log('\nStep 2: Poll for completion');
        console.log('Status URL:', status_url);
        console.log('Response URL:', response_url);

        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const statusResponse = await axios.get(status_url, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                    timeout: 10000
                });

                const status = statusResponse.data.status;
                console.log(`Attempt ${attempts + 1}: Status = ${status}`);

                if (status === 'COMPLETED') {
                    console.log('\n✓ Request completed!');
                    console.log('Status Response:', JSON.stringify(statusResponse.data, null, 2));

                    // Check if audio is in status response
                    if (statusResponse.data.audio && statusResponse.data.audio.url) {
                        console.log('\n✓✓✓ SUCCESS! ✓✓✓');
                        console.log('Audio URL:', statusResponse.data.audio.url);
                        console.log('Duration:', statusResponse.data.audio.duration);
                        console.log('File Size:', statusResponse.data.audio.file_size);
                        return;
                    }

                    // Otherwise try response_url
                    console.log('\nFetching from response_url...');
                    const resultResponse = await axios.get(response_url, { timeout: 30000 });
                    console.log('Result:', JSON.stringify(resultResponse.data, null, 2));
                    return;

                } else if (status === 'FAILED') {
                    console.log('\n✗ Request failed:', statusResponse.data.error);
                    return;
                }

            } catch (error) {
                console.log(`Error checking status:`, error.message);
            }

            attempts++;
        }

        console.log('\n✗ Timed out waiting for completion');

    } catch (error) {
        console.log('\n✗ Queue submission failed:');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
    }
}

testQueueToResult();
