require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testRequestFormats() {
    console.log('=== Testing Different Request Formats for playai/tts/v3 ===\n');

    const formats = [
        {
            name: 'Format 1: input + voice (no response_format)',
            body: {
                input: 'Testing speech generation',
                voice: 'Jennifer (English (US)/American)'
            }
        },
        {
            name: 'Format 2: input + voice + response_format',
            body: {
                input: 'Testing speech generation',
                voice: 'Jennifer (English (US)/American)',
                response_format: 'url'
            }
        },
        {
            name: 'Format 3: text + voice (alternative field name)',
            body: {
                text: 'Testing speech generation',
                voice: 'Jennifer (English (US)/American)'
            }
        },
        {
            name: 'Format 4: With seed parameter',
            body: {
                input: 'Testing speech generation',
                voice: 'Jennifer (English (US)/American)',
                response_format: 'url',
                seed: 42
            }
        }
    ];

    for (const format of formats) {
        console.log(`Testing: ${format.name}`);
        console.log('Request:', JSON.stringify(format.body, null, 2));

        try {
            const response = await axios.post(
                'https://fal.run/fal-ai/playai/tts/v3',
                format.body,
                {
                    headers: {
                        'Authorization': `Key ${FAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            console.log('\n✓✓✓ SUCCESS! ✓✓✓');
            console.log('Status:', response.status);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            console.log('\nAudio URL:', response.data.audio?.url);
            console.log('---\n');
            break; // Stop on first success

        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;

            if (status === 200 || status === 202) {
                console.log('✓ Partial success (status 200/202)');
            } else if (status === 422) {
                console.log(`✗ Validation Error (422):`, JSON.stringify(data, null, 2).substring(0, 300));
            } else if (status === 401) {
                console.log(`✗ Unauthorized (401):`, data?.detail || error.message);
            } else {
                console.log(`✗ Error (${status}):`, data?.detail || error.message);
            }
            console.log('---\n');
        }
    }
}

testRequestFormats();
