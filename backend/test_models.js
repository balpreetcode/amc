require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testModel(modelName) {
    const requestBody = {
        input: 'Testing model',
        voice: 'bella',
        output_format: 'mp3'
    };

    try {
        const response = await axios.post(
            `https://fal.run/${modelName}`,
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        console.log(`✓ ${modelName} - SUCCESS`);
        return { success: true, model: modelName, data: response.data };
    } catch (error) {
        const msg = error.response?.data?.detail || error.message;
        console.log(`✗ ${modelName} - FAILED`);
        return { success: false, model: modelName, error: msg };
    }
}

async function testMultipleModels() {
    console.log('=== Testing Different Fal AI TTS Models ===\n');

    const models = [
        // Try different model variations
        'fal-ai/playht/tts/v3',
        'fal-ai/playht-tts',
        'playht/tts/v3',
        'fal-ai/playht',
        'fal-ai/speech synthesis',
        'fal-ai/tts',

        // Try other common Fal AI TTS models
        'fal-ai/kokoro',
        'fal-ai/fast-speech',
    ];

    const results = [];

    for (const model of models) {
        const result = await testModel(model);
        results.push(result);
    }

    console.log('\n=== RESULTS ===');
    console.log('\n✓ VALID MODELS:');
    results.filter(r => r.success).forEach(r => {
        console.log(`  - ${r.model}`);
        if (r.data?.audio?.url) {
            console.log(`    Audio URL: ${r.data.audio.url}`);
        }
    });

    console.log('\n✗ INVALID MODELS:');
    results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.model}`);
    });
}

testMultipleModels();
