/**
 * Speech Generation Module
 * Uses Fal AI for text-to-speech generation
 */

const axios = require('axios');

const fs = require('fs');
const path = require('path');

const FAL_API_KEY = process.env.FAL_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Debug: Log at module load time
console.log('[Speech Module] Loaded. FAL_KEY:', FAL_API_KEY ? 'SET (' + FAL_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
console.log('[Speech Module] OPENAI_API_KEY:', OPENAI_API_KEY ? 'SET' : 'NOT SET');

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
 * Post to Fal AI API (synchronous - may timeout for slow models)
 */
async function postToFal(model, body) {
    console.log('[Fal AI] Calling model:', model);
    console.log('[Fal AI] Request body:', JSON.stringify(body, null, 2));
    console.log('[Fal AI] FAL_API_KEY present:', FAL_API_KEY ? 'YES (' + FAL_API_KEY.substring(0, 10) + '...)' : 'NO!');
    console.log('[Fal AI] Authorization header:', 'Key ' + (FAL_API_KEY ? FAL_API_KEY.substring(0, 10) + '...' : 'MISSING'));

    const response = await axios.post(
        `https://fal.run/${model}`,
        body,
        {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000 // 2 minute timeout
        }
    );
    return response.data;
}

/**
 * Post to Fal AI API using async queue (for slow models like TTS)
 */
async function postToFalAsync(model, body) {
    console.log('[Fal AI Async] Submitting to queue:', model);
    console.log('[Fal AI Async] Request body:', JSON.stringify(body, null, 2));
    console.log('[Fal AI Async] FAL_API_KEY present:', FAL_API_KEY ? 'YES (' + FAL_API_KEY.substring(0, 10) + '...)' : 'NO!');

    const headers = {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json'
    };

    // Submit to queue
    const queueResponse = await axios.post(
        `https://queue.fal.run/${model}`,
        body,
        { headers, timeout: 300000 }
    );

    const { request_id, status_url, response_url } = queueResponse.data;
    console.log(`[Fal AI Async] Queued with request_id: ${request_id}`);

    // Poll for completion (max 5 minutes)
    let attempts = 0;
    const maxAttempts = 150; // 5 minutes with 2 second intervals

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        try {
            const statusRes = await axios.get(status_url, { headers, timeout: 10000 });
            const { status } = statusRes.data;

            if (attempts % 5 === 0) {
                console.log(`[Fal AI Async] Status: ${status} (attempt ${attempts})`);
            }

            if (status === 'COMPLETED') {
                const resultRes = await axios.get(response_url, { headers, timeout: 300000 });
                console.log('[Fal AI Async] Completed successfully');
                return resultRes.data;
            }

            if (status === 'FAILED') {
                const errorDetails = statusRes.data.error || 'Unknown error';
                throw new Error(`Fal AI request failed: ${errorDetails}`);
            }
        } catch (err) {
            if (err.response?.status !== 202) {
                throw err;
            }
        }
    }

    throw new Error('Fal AI request timed out after 5 minutes');
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
        provider: 'fal',
        model,
        originalText: originalText.substring(0, 100),
        translatedText: text.substring(0, 100),
        voice,
        language
    };


    try {
        // Different models have different request formats
        let requestBody;

        if (model.includes('playht')) {
            // Validate and map voice for PlayHT
            const validPlayHTVoices = ['Jennifer', 'Dexter', 'Scarlett', 'Brandon'];
            let playhtVoice = voice;
            if (!validPlayHTVoices.includes(voice)) {
                playhtVoice = 'Jennifer'; // Default fallback voice
                console.log(`[PlayHT] Voice '${voice}' not valid, using '${playhtVoice}'`);
            }
            requestBody = {
                input: text,
                voice: playhtVoice,
                output_format: 'mp3'
            };
        } else if (model.includes('chatterbox')) {
            // Chatterbox uses text + language format
            const languageMap = {
                'English': 'en',
                'Hindi': 'hi'
            };
            requestBody = {
                text: text,
                language: languageMap[language] || 'en'
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

        // Use async queue API for Chatterbox (needs longer processing time)
        const result = model.includes('chatterbox')
            ? await postToFalAsync(model, requestBody)
            : await postToFal(model, requestBody);

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
        console.error(`[Fal AI TTS] FAILED with model ${model}: ${error.message}`);
        if (error.response) {
            console.error('[Fal AI TTS] Error Response:', JSON.stringify(error.response.data, null, 2));
        }
        // No fallback - throw the error directly
        throw error;
    }
}

module.exports = {
    generateSpeech
};
