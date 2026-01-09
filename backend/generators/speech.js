/**
 * Speech Generation Module
 * Uses Fal AI for text-to-speech generation
 */

const axios = require('axios');

const fs = require('fs');
const path = require('path');

const FAL_API_KEY = process.env.FAL_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Translate text to target language using OpenAI
 */
async function translateText(text, targetLanguage) {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is missing');
    }

    const languageMap = {
        'Hindi': 'Hindi (हिन्दी)',
        'English': 'English'
    };

    const targetLang = languageMap[targetLanguage] || targetLanguage;

    console.log(`[Translation] Translating text to ${targetLang}: ${text.substring(0, 50)}...`);

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Translate the given text to ${targetLang}. Return ONLY the translated text, nothing else. Preserve the tone and meaning accurately.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3
        },
        {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const translatedText = response.data.choices[0].message.content.trim();
    console.log(`[Translation] Result: ${translatedText.substring(0, 100)}...`);

    return translatedText;
}

// Base directories
// Use __filename to ensure correct path resolution regardless of execution environment
const BASE_DIR = path.dirname(path.dirname(path.dirname(__filename)));
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
async function generateSpeechOpenAI(text, voice = 'alloy', model = 'tts-1', language = 'English') {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is missing');
    }

    console.log(`[OpenAI TTS] Generating speech for text: ${text.substring(0, 50)}... in ${language} language`);

    const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
            model: model,
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

    // Save locally as backup
    fs.writeFileSync(outputPath, response.data);

    // Verify file was created successfully
    if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to save speech file: ${outputPath}`);
    }

    const fileSize = fs.statSync(outputPath).size;
    console.log(`[OpenAI TTS] Saved ${fileSize} bytes to: ${outputPath}`);

    // Try to upload to R2 Cloudflare for public URL
    try {
        const { uploadToR2, isR2Configured } = require('../utils/r2Storage');

        console.log(`[OpenAI TTS] Checking R2 configuration... configured=${isR2Configured()}`);

        if (isR2Configured()) {
            const buffer = Buffer.from(response.data);
            const publicUrl = await uploadToR2(buffer, `speech_${timestamp}`, 'audio/mpeg');
            console.log(`[OpenAI TTS] Uploaded to R2: ${publicUrl}`);
            return publicUrl;
        } else {
            console.log('[OpenAI TTS] R2 not configured, skipping upload');
        }
    } catch (uploadError) {
        console.error(`[OpenAI TTS] R2 upload failed, using local URL: ${uploadError.message}`);
        console.error(uploadError); // Print full stack trace
    }

    // Fallback to local URL if R2 not configured or upload failed
    const PORT = process.env.PORT || 3002;
    return `http://localhost:${PORT}/output/${filename}`;
}

/**
 * Generate speech from text
 * @param {string} text - Text to convert to speech
 * @param {string} voice - Voice ID to use
 * @param {string} model - TTS model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @param {string} language - Language for speech generation (English or Hindi)
 * @returns {Promise<string|object>} Generated audio URL or object with result and metadata
 */
async function generateSpeech(text, voice = 'aaron', model = 'fal-ai/chatterbox/text-to-speech/turbo', includeMetadata = false, language = 'English') {
    const startTime = Date.now();
    let originalText = text;

    // Translate text if target language is not English
    if (language && language !== 'English') {
        console.log(`[TTS] Translating text from English to ${language}...`);
        text = await translateText(text, language);
        console.log(`[TTS] Translation complete. Generating speech in ${language}...`);
    }

    const requestMetadata = {
        provider: model.startsWith('openai') ? 'openai' : 'fal',
        model,
        originalText: originalText.substring(0, 100),
        translatedText: text.substring(0, 100),
        voice,
        language
    };

    // Extract model name if it has openai/ prefix
    const openaiModel = model.startsWith('openai/') ? model.replace('openai/', '') : 'tts-1';

    // If model is openai or fal fails, use OpenAI
    if (model === 'openai-tts' || model.startsWith('openai')) {
        const audioUrl = await generateSpeechOpenAI(text, voice === 'af_bella' ? 'alloy' : voice, openaiModel, language);

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
        } else if (model.includes('chatterbox')) {
            requestBody = {
                text: text,
                voice: voice,
                temperature: 0.8
            };
            if (model.includes('turbo')) {
                // Ensure exact model match if needed, or just use the passed model
                // The 'turbo' model uses the same payload structure
            }
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
        console.warn(`Fal AI TTS failed: ${error.message}`);
        if (error.response) {
            console.warn('Fal AI Error Response:', JSON.stringify(error.response.data, null, 2));
        }
        console.warn('Falling back to OpenAI...');
        // Fallback to OpenAI if Fal AI fails
        const audioUrl = await generateSpeechOpenAI(text, 'alloy', 'tts-1', language);

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
