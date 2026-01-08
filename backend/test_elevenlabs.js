require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testElevenLabs() {
    console.log('=== Testing Fal AI ElevenLabs TTS ===\n');

    const requestBody = {
        text: 'This is a test of ElevenLabs text-to-speech through Fal AI',
        voice_id: '21m00Tcm4TlvDq8ikWAM'  // Default ElevenLabs voice
    };

    console.log('Model: fal-ai/elevenlabs/tts/eleven-v3');
    console.log('Request:', JSON.stringify(requestBody, null, 2));
    console.log('');

    try {
        // Try direct endpoint first
        console.log('Step 1: Testing direct endpoint...');
        const response = await axios.post(
            'https://fal.run/fal-ai/elevenlabs/tts/eleven-v3',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000
            }
        );

        console.log('✓✓✓ SUCCESS! ✓✓✓');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        console.log('\nAudio URL:', response.data.audio?.url || response.data.audio_url);

        if (response.data.audio) {
            console.log('\n=== RESULT ===');
            console.log('Audio URL:', response.data.audio.url);
            console.log('Duration:', response.data.audio.duration);
            console.log('Content Type:', response.data.audio.content_type);
            console.log('\n✓ ElevenLabs TTS works perfectly!');
        }

    } catch (error) {
        console.log('✗ Direct endpoint failed:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));

        // Try queue endpoint
        console.log('\nStep 2: Trying queue endpoint...');
        try {
            const queueResponse = await axios.post(
                'https://queue.fal.run/fal-ai/elevenlabs/tts/eleven-v3',
                requestBody,
                {
                    headers: {
                        'Authorization': `Key ${FAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            console.log('✓ Queue submission successful!');
            console.log('Queue Response:', JSON.stringify(queueResponse.data, null, 2));

            const { status_url, response_url } = queueResponse.data;
            console.log('\nStep 3: Polling for completion...');

            let attempts = 0;
            while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const statusResponse = await axios.get(status_url, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                    timeout: 10000
                });

                const status = statusResponse.data.status;
                console.log(`Attempt ${attempts + 1}: ${status}`);

                if (status === 'COMPLETED') {
                    console.log('\n✓ Request completed!');

                    if (statusResponse.data.audio && statusResponse.data.audio.url) {
                        console.log('\n✓✓✓ SUCCESS! ✓✓✓');
                        console.log('Audio URL:', statusResponse.data.audio.url);
                        return;
                    }

                    // Try fetching from response_url
                    console.log('Fetching from response_url...');
                    const resultResponse = await axios.get(response_url, { timeout: 30000 });
                    console.log('Result:', JSON.stringify(resultResponse.data, null, 2));
                    return;
                } else if (status === 'FAILED') {
                    console.log('✗ Request failed:', statusResponse.data.error);
                    return;
                }

                attempts++;
            }

        } catch (queueError) {
            console.log('✗ Queue also failed:', queueError.response?.status, queueError.response?.data || queueError.message);
        }
    }
}

testElevenLabs();
