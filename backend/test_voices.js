require('dotenv').config();
const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

async function testVoice(voiceName) {
    const requestBody = {
        input: 'Testing voice',
        voice: voiceName,
        output_format: 'mp3'
    };

    try {
        const response = await axios.post(
            'https://fal.run/fal-ai/playht/tts/v3',
            requestBody,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        console.log(`✓ ${voiceName} - SUCCESS`);
        return true;
    } catch (error) {
        const msg = error.response?.data?.detail?.[0]?.msg || 'Unknown error';
        console.log(`✗ ${voiceName} - FAILED: ${msg}`);
        return false;
    }
}

async function testMultipleVoices() {
    console.log('=== Testing Different Voice Name Formats ===\n');

    const voices = [
        // Try without af_ prefix
        'bella',
        'sarah',
        'heart',
        'nicole',
        'michael',
        'jennifer',
        'henry',
        'george',

        // Try with af_ prefix
        'af_bella',
        'af_sarah',
        'af_heart',
        'af_nicole',
        'af_michael',

        // Try other formats
        'AF_Bella',
        'af-bella',
        'Bella',
        'Sarah',
    ];

    const validVoices = [];
    const invalidVoices = [];

    for (const voice of voices) {
        const isValid = await testVoice(voice);
        if (isValid) {
            validVoices.push(voice);
        } else {
            invalidVoices.push(voice);
        }
    }

    console.log('\n=== RESULTS ===');
    console.log('\n✓ VALID VOICES:');
    validVoices.forEach(v => console.log(`  - ${v}`));

    console.log('\n✗ INVALID VOICES:');
    invalidVoices.forEach(v => console.log(`  - ${v}`));
}

testMultipleVoices();
