/**
 * Check what models are available on your Fal AI account
 */
require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function checkAccountInfo() {
    console.log('=== Checking Fal AI Account ===');
    console.log('FAL_KEY:', FAL_API_KEY.substring(0, 20) + '...' + FAL_API_KEY.substring(FAL_API_KEY.length - 10));
    console.log('');

    // Try to get account information
    try {
        const response = await axios.get('https://queue.fal.run/account', {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`
            }
        });
        console.log('Account Info:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('Account check failed:', error.response?.status, error.response?.data || error.message);
    }
}

async function testAvailableModels() {
    console.log('\n=== Testing Available Models ===\n');

    const models = [
        // TTS models
        'fal-ai/playai/tts/v3',
        'fal-ai/elevenlabs/tts/eleven-v3',

        // Video models (we know these work)
        'fal-ai/ltxv-13b-098-distilled/image-to-video',
        'fal-ai/wan/v2.1/image-to-video',

        // Image models
        'fal-ai/flux-pro/v1.1-ultra',
    ];

    const results = {
        working: [],
        not_working: []
    };

    for (const model of models) {
        try {
            const response = await axios.post(
                `https://fal.run/${model}`,
                {},  // Empty request to test access
                {
                    headers: {
                        'Authorization': `Key ${FAL_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.status === 200 || response.status === 202 || response.status === 422) {
                // 422 means we can access but request format is wrong - that's good!
                results.working.push(model);
                console.log(`✓ ${model} - ACCESSIBLE`);
            }
        } catch (error) {
            const status = error.response?.status;
            const detail = error.response?.data?.detail || '';

            if (status === 401 && detail.includes('No user found')) {
                results.not_working.push({ model, reason: 'Not authorized' });
                console.log(`✗ ${model} - NOT AUTHORIZED (401)`);
            } else if (status === 404) {
                results.not_working.push({ model, reason: 'Not found (404)' });
                console.log(`✗ ${model} - NOT FOUND (404)`);
            } else if (status === 422) {
                // 422 means we can access the model
                results.working.push(model);
                console.log(`✓ ${model} - ACCESSIBLE (validation error expected)`);
            } else {
                results.not_working.push({ model, reason: `${status}: ${detail}` });
                console.log(`✗ ${model} - ERROR ${status}`);
            }
        }
    }

    console.log('\n=== SUMMARY ===');
    console.log('\n✓ WORKING MODELS:');
    results.working.forEach(m => console.log(`  - ${m}`));

    console.log('\n✗ NOT WORKING:');
    results.not_working.forEach(r => console.log(`  - ${r.model}: ${r.reason}`));
}

async function main() {
    await checkAccountInfo();
    await testAvailableModels();

    console.log('\n=== NEXT STEPS ===');
    console.log('1. Visit https://fal.ai/dashboard');
    console.log('2. Check "Models" or "API Keys" section');
    console.log('3. Look for "playai/tts/v3" or "ElevenLabs TTS" models');
    console.log('4. Enable them if available');
    console.log('5. Or check if you need to upgrade your plan for TTS access\n');
}

main();
