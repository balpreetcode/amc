/**
 * Speech Generation Module
 *
 * Supports two TTS providers with different return patterns:
 *
 * 1. FAL AI TTS (Primary):
 *    - Returns external URL directly (e.g., https://v3b.fal.media/files/.../audio.mp3)
 *    - No local download needed until final composition
 *    - Consistent with video and music generators
 *
 * 2. OpenAI TTS (Fallback):
 *    - OpenAI API returns binary audio data, not URL
 *    - Saves to local filesystem
 *    - Returns absolute filesystem path (e.g., /home/app/output/speech_openai_123.mp3)
 *    - downloadFile() in ffmpeg.js will copy directly without HTTP requests
 *    - Avoids localhost HTTP 404 errors in Docker environments
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
            },
            timeout: 30000 // 30 second timeout
        }
    );

    const translatedText = response.data.choices[0].message.content.trim();
    console.log(`[Translation] Result: ${translatedText.substring(0, 100)}...`);

    return translatedText;
}

// Base directories
const BASE_DIR = path.resolve(__dirname, '..', '..');
// Use OUTPUT_DIR env var for Docker, otherwise use relative path (consistent with server.js, ffmpeg.js, openai-image.js)
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(BASE_DIR, 'output');
// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/**
 * Post to Fal AI API - tries direct endpoint first, falls back to queue
 */
async function postToFal(model, body) {
    console.log(`[Fal AI TTS] Calling model: ${model}`);
    console.log(`[Fal AI TTS] Request body:`, JSON.stringify(body, null, 2));

    // First try the direct synchronous endpoint (faster for TTS)
    try {
        const response = await axios.post(
            `https://fal.run/${model}`,
            body,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minutes for direct processing
            }
        );

        console.log(`[Fal AI TTS] Direct endpoint success!`);
        return response.data;
    } catch (directError) {
        console.warn(`[Fal AI TTS] Direct endpoint failed:`, directError.response?.status, directError.response?.data?.detail || directError.message);

        // If direct fails with timeout or queue indication, use queue endpoint
        if (directError.response?.status === 202 || directError.response?.status === 503 ||
            directError.code === 'ECONNABORTED' ||
            (directError.response?.data && typeof directError.response.data === 'object' &&
             ('queue_position' in directError.response.data || 'request_id' in directError.response.data))) {

            console.log(`[Fal AI TTS] Falling back to queue endpoint...`);
            return await postToFalQueue(model, body);
        }

        // Otherwise throw the original error
        throw directError;
    }
}

/**
 * Post to Fal AI Queue API with polling (fallback for slower requests)
 */
async function postToFalQueue(model, body) {
    console.log(`[Fal AI TTS] Submitting to queue: ${model}`);

    // Submit to queue
    let queueResponse;
    try {
        queueResponse = await axios.post(
            `https://queue.fal.run/${model}`,
            body,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout for queue submission
            }
        );
    } catch (error) {
        const errorDetail = error.response?.data?.detail;

        // Provide detailed error messages
        let errorMessage = `Fal AI TTS failed: ${error.message}`;

        // Extract validation error details (for 422 errors)
        if (Array.isArray(errorDetail)) {
            const details = errorDetail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
            errorMessage = `Fal AI validation error: ${details}`;
            console.error('[Fal AI TTS] Validation error details:', errorDetail);
        } else if (typeof errorDetail === 'string') {
            errorMessage = `Fal AI error: ${errorDetail}`;

            // Check if it's a balance exhausted error
            if (errorDetail.toLowerCase().includes('exhausted balance') ||
                errorDetail.toLowerCase().includes('locked')) {
                errorMessage = 'Your FAL API balance exhausted';
            }
        } else if (error.response?.status === 403 || error.response?.status === 402) {
            errorMessage = 'Your FAL API balance exhausted or access denied';
        }

        console.error('[Fal AI TTS] Queue submission error:', {
            status: error.response?.status,
            message: errorMessage,
            detail: errorDetail
        });

        throw new Error(errorMessage);
    }

    const { request_id, status_url, response_url } = queueResponse.data;
    console.log(`[Fal AI TTS] Queued with request_id: ${request_id}`);

    // Poll for completion (TTS is faster than video)
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (2s intervals)

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const statusResponse = await axios.get(status_url, {
                headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                timeout: 10000
            });

            const status = statusResponse.data.status;

            if (status === 'COMPLETED') {
                console.log(`[Fal AI TTS] Request completed after ${attempts * 2}s`);

                // Check if status response already contains the result
                if (statusResponse.data.audio && statusResponse.data.audio.url) {
                    console.log(`[Fal AI TTS] Audio URL in status response: ${statusResponse.data.audio.url}`);
                    return statusResponse.data;
                }

                // Fetch the actual result from response_url
                console.log(`[Fal AI TTS] Fetching result from: ${response_url}`);
                try {
                    let resultResponse;
                    try {
                        // Try without auth (public URL)
                        resultResponse = await axios.get(response_url, { timeout: 30000 });
                        console.log(`[Fal AI TTS] Result received without auth`);
                    } catch (noAuthError) {
                        // If that fails, try with auth
                        console.log(`[Fal AI TTS] Retrying with authentication...`);
                        resultResponse = await axios.get(response_url, {
                            headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                            timeout: 30000
                        });
                    }

                    console.log(`[Fal AI TTS] Result received:`, JSON.stringify(resultResponse.data, null, 2).substring(0, 200));
                    return resultResponse.data;
                } catch (resultError) {
                    console.error(`[Fal AI TTS] Result fetch error:`, {
                        status: resultError.response?.status,
                        data: resultError.response?.data,
                        message: resultError.message
                    });
                    throw new Error(`Fal AI result fetch failed: ${resultError.message}`);
                }
            } else if (status === 'FAILED') {
                throw new Error(statusResponse.data.error || 'Fal AI request failed');
            }

            if (attempts % 10 === 0) {
                console.log(`[Fal AI TTS] Still processing... (${attempts * 2}s elapsed)`);
            }

        } catch (error) {
            if (error.response?.status !== 401 || error.config?.url === response_url) {
                // Log all errors except 401 from status checks
                console.error(`[Fal AI TTS] Status check error: ${error.message}`);
            }
        }

        attempts++;
    }

    throw new Error('Fal AI TTS request timed out after 2 minutes');
}

/**
 * Generate speech using OpenAI TTS
 * Returns the saved file path for local file system access
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
            responseType: 'arraybuffer',
            timeout: 60000 // 60 second timeout
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
    console.log(`[OpenAI TTS] Absolute path: ${outputPath}`);

    // CRITICAL: Return absolute filesystem path (not URL) so downloadFile() can copy directly
    // This avoids localhost HTTP requests that fail in Docker
    return outputPath;
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
async function generateSpeech(text, voice = '21m00Tcm4TlvDq8ikWAM', model = 'fal-ai/elevenlabs/tts/eleven-v3', includeMetadata = false, language = 'English') {
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

    // If model is openai, use OpenAI TTS
    if (model === 'openai-tts' || model.startsWith('openai')) {
        // Map Fal AI/ElevenLabs voices to OpenAI voices for direct OpenAI model selection
        const openaiVoiceMap = {
            // ElevenLabs voice IDs
            '21m00Tcm4TlvDq8ikWAM': 'alloy',
            'AZnzlk1XvdvUeBnXmlld': 'echo',
            'EXAVITQu4vr4xnSDxMaL': 'nova',
            'ErXwobaYiN0WOjL6daga': 'fable',
            'D38z5ibotCL8ShYi7JkV': 'onyx',
            // Fal AI playai voices
            'af_bella': 'alloy',
            'af_heart': 'echo',
            'af_nicole': 'fable',
            'af_sarah': 'nova',
            'af_michael': 'onyx'
        };
        const mappedVoice = openaiVoiceMap[voice] || 'alloy';

        const audioPath = await generateSpeechOpenAI(text, mappedVoice, openaiModel, language);

        console.log(`[TTS] OpenAI TTS complete with voice '${mappedVoice}'. File path: ${audioPath}`);

        if (includeMetadata) {
            return {
                result: audioPath,  // Return filesystem path for direct file access
                apiCall: {
                    request: requestMetadata,
                    response: {
                        audioUrl: audioPath,  // Store filesystem path
                        format: 'mp3'
                    },
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };
        }
        return audioPath;
    }

    try {
        // Different models have different request formats
        let requestBody;

        if (model.includes('elevenlabs')) {
            // ElevenLabs format
            requestBody = {
                text: text,
                voice_id: voice
            };
        } else if (model.includes('playai')) {
            // Use playai model (updated from playht)
            requestBody = {
                input: text,
                voice: voice
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

        console.log(`[TTS] Calling Fal AI with model: ${model}`);
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

        console.log(`[TTS] Fal AI success. External URL: ${audioUrl}`);

        if (includeMetadata) {
            return {
                result: audioUrl,  // Return external FAL URL for direct download
                apiCall: {
                    request: requestMetadata,
                    response: {
                        audioUrl,  // Store external FAL URL
                        format: 'mp3',
                        duration: result.duration
                    },
                    timestamp: new Date().toISOString(),
                    duration: Date.now() - startTime
                }
            };
        }

        return audioUrl;  // Return external FAL URL
    } catch (error) {
        const errorMsg = error.response ? `HTTP ${error.response.status}: ${error.response.statusText}` : error.message;
        console.warn(`[TTS] Fal AI failed (${errorMsg}), falling back to OpenAI TTS...`);

        // Fallback to OpenAI if Fal AI fails - use hardcoded 'alloy' voice (works for both Hindi and English)
        const OPENAI_FALLBACK_VOICE = 'alloy';
        try {
            const audioPath = await generateSpeechOpenAI(text, OPENAI_FALLBACK_VOICE, 'tts-1', language);
            console.log(`[TTS] OpenAI fallback success with voice '${OPENAI_FALLBACK_VOICE}'. File path: ${audioPath}`);

            if (includeMetadata) {
                requestMetadata.provider = 'openai';
                requestMetadata.fallback = true;
                requestMetadata.fallbackReason = errorMsg;
                return {
                    result: audioPath,  // Return filesystem path
                    apiCall: {
                        request: requestMetadata,
                        response: {
                            audioUrl: audioPath,  // Store filesystem path
                            format: 'mp3'
                        },
                        timestamp: new Date().toISOString(),
                        duration: Date.now() - startTime
                    }
                };
            }
            return audioPath;  // Return filesystem path
        } catch (fallbackError) {
            console.error(`[TTS] OpenAI fallback also failed: ${fallbackError.message}`);
            throw new Error(`TTS failed: Fal (${errorMsg}) and OpenAI fallback (${fallbackError.message})`);
        }
    }
}

module.exports = {
    generateSpeech
};
