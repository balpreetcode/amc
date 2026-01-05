/**
 * Music Generation Module
 * Uses Fal AI for text-to-music generation
 */

const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

/**
 * Post to Fal AI API
 * @param {string} model - Model identifier
 * @param {object} body - Request body
 * @returns {Promise<object>} API response
 */
async function postToFal(model, body) {
    try {
        const response = await axios.post(
            `https://fal.run/${model}`,
            body,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minute timeout for music generation
            }
        );
        return response.data;
    } catch (error) {
        // Check if it's a balance exhausted error
        if (error.response?.status === 403 || error.response?.status === 402) {
            const errorDetail = error.response?.data?.detail || '';
            if (errorDetail.toLowerCase().includes('exhausted balance') ||
                errorDetail.toLowerCase().includes('locked')) {
                throw new Error('Your FAL API balance exhausted');
            }
        }
        throw error;
    }
}

/**
 * Generate music from text prompt
 * @param {string} prompt - Music description (genre, mood, instruments)
 * @param {number} duration - Duration in seconds
 * @param {string} model - Music generation model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated audio URL or object with result and metadata
 */
async function generateMusic(prompt, duration = 30, model = 'fal-ai/stable-audio', includeMetadata = false) {
    const requestPayload = {
        prompt,
        duration: duration
    };

    const requestMetadata = {
        provider: 'fal',
        model,
        prompt,
        duration
    };

    const startTime = Date.now();

    const result = await postToFal(model, requestPayload);

    const apiDuration = Date.now() - startTime;

    // Handle different response formats
    let audioUrl;
    if (result.audio_file && result.audio_file.url) {
        audioUrl = result.audio_file.url;
    } else if (result.audio && result.audio.url) {
        audioUrl = result.audio.url;
    } else if (result.audio_url) {
        audioUrl = result.audio_url;
    } else {
        throw new Error('No music generated');
    }

    if (includeMetadata) {
        return {
            result: audioUrl,
            apiCall: {
                request: requestMetadata,
                response: {
                    audioUrl,
                    duration: result.duration,
                    seed: result.seed
                },
                timestamp: new Date().toISOString(),
                duration: apiDuration
            }
        };
    }

    return audioUrl;
}

module.exports = {
    generateMusic
};
