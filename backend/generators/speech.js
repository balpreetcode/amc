/**
 * Speech Generation Module
 * Uses Fal AI for text-to-speech generation
 */

const axios = require('axios');

const fs = require('fs');
const path = require('path');

const FAL_API_KEY = process.env.FAL_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Base directories
const BASE_DIR = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(BASE_DIR, 'output');

/**
 * Post to Fal AI API
 */
async function postToFal(model, body) {
    const response = await axios.post(
        `https://fal.run/${model}`,
        body,
        {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
}

/**
 * Generate speech using OpenAI TTS
 */
async function generateSpeechOpenAI(text, voice = 'alloy') {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is missing');
    }

    console.log(`[OpenAI TTS] Generating speech for text: ${text.substring(0, 50)}...`);

    const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
            model: 'tts-1',
            input: text,
            voice: voice,
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        }
    );

    const timestamp = Date.now();
    const filename = `speech_openai_${timestamp}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(outputPath, response.data);

    // Verify file was created successfully
    if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to save speech file: ${outputPath}`);
    }

    const fileSize = fs.statSync(outputPath).size;
    console.log(`[OpenAI TTS] Saved ${fileSize} bytes to: ${outputPath}`);

    // Return URL for HTTP access (consistent with openai-image.js)
    const PORT = process.env.PORT || 3002;
    return `http://localhost:${PORT}/output/${filename}`;
}

/**
 * Generate speech from text
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice ID to use
 * @param {string} model - TTS model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated audio URL or object with result and metadata
 */
async function generateSpeech(text, voice = 'af_bella', model = 'fal-ai/playht/tts/v3', includeMetadata = false) {
    const startTime = Date.now();
    const requestMetadata = {
        provider: model.startsWith('openai') ? 'openai' : 'fal',
        model,
        text: text.substring(0, 100),
        voice
    };

    // If model is openai or fal fails, use OpenAI
    if (model === 'openai-tts' || model.startsWith('openai')) {
        const audioUrl = await generateSpeechOpenAI(text, voice === 'af_bella' ? 'alloy' : voice);

        if (includeMetadata) {
            return {
                result: audioUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        audioUrl,
                        format: 'mp3'
                    },
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };
        }
        return audioUrl;
    }

    try {
        // Different models have different request formats
        let requestBody;

        if (model.includes('playht')) {
            requestBody = {
                input: text,
                voice: voice,
                output_format: 'mp3'
            };
        } else if (model.includes('kokoro')) {
            requestBody = {
                text: text,
                voice: voice
            };
        } else {
            requestBody = {
                text: text,
                voice: voice
            };
        }

        const result = await postToFal(model, requestBody);

        // Handle different response formats
        let audioUrl;
        if (result.audio && result.audio.url) {
            audioUrl = result.audio.url;
        } else if (result.audio_url) {
            audioUrl = result.audio_url;
        } else if (result.url) {
            audioUrl = result.url;
        } else {
            throw new Error('No audio URL in response');
        }

        if (includeMetadata) {
            return {
                result: audioUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        audioUrl,
                        format: 'mp3',
                        duration: result.duration
                    },
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };
        }

        return audioUrl;
    } catch (error) {
        console.warn(`Fal AI TTS failed, falling back to OpenAI: ${error.message}`);
        // Fallback to OpenAI if Fal AI fails
        const audioUrl = await generateSpeechOpenAI(text, 'alloy');

        if (includeMetadata) {
            requestMetadata.provider = 'openai';
            requestMetadata.fallback = true;
            return {
                result: audioUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        audioUrl,
                        format: 'mp3'
                    },
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };
        }
        return audioUrl;
    }
}

module.exports = {
    generateSpeech
};
