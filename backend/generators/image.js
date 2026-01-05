/**
 * Image Generation Module
 * Uses Fal AI for text-to-image generation
 */

const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

/**
 * Post to Fal AI API (sync endpoint)
 * @param {string} model - Model identifier
 * @param {object} body - Request body
 * @returns {Promise<object>} API response
 */
async function postToFal(type, model, body) {
    // Use fal.run for synchronous requests
    try {
        const response = await axios.post(
            `https://fal.run/${model}`,
            body,
            {
                headers: {
                    'Authorization': `Key ${FAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minute timeout for image generation
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
 * Post to Fal AI Queue API (async with polling)
 * @param {string} model - Model identifier
 * @param {object} body - Request body
 * @returns {Promise<object>} API response
 */
async function postToFalQueue(model, body) {
    console.log(`[Fal AI] Submitting to queue: ${model}`);

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

    const { request_id, response_url, status_url } = queueResponse.data;
    console.log(`[Fal AI] Queued with request_id: ${request_id}`);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max (2s intervals)

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

        try {
            const statusResponse = await axios.get(status_url, {
                headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                timeout: 10000 // 10 second timeout for status checks
            });

            const { status } = statusResponse.data;
            console.log(`[Fal AI] Status: ${status}`);

            if (status === 'COMPLETED') {
                // Fetch the result
                const resultResponse = await axios.get(response_url, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                    timeout: 30000 // 30 second timeout for result retrieval
                });
                return resultResponse.data;
            } else if (status === 'FAILED') {
                throw new Error('Fal AI generation failed');
            }
        } catch (error) {
            if (error.response?.status !== 202) {
                throw error;
            }
        }

        attempts++;
    }

    throw new Error('Fal AI generation timed out');
}

/**
 * Generate image from text prompt
 * @param {string} prompt - Image description
 * @param {string} aspectRatio - Aspect ratio (e.g., "16:9", "1:1")
 * @param {string} model - Fal AI model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated image URL or object with result and metadata
 */
async function generateImage(prompt, aspectRatio = '16:9', model = 'fal-ai/z-image/turbo', includeMetadata = false) {
    const startTime = Date.now();
    const imageSize = aspectRatio === '16:9' ? 'landscape_16_9' :
        aspectRatio === '9:16' ? 'portrait_16_9' : 'square';

    console.log(`[Fal AI] Generating image with model: ${model}`);
    console.log(`[Fal AI] Prompt: ${prompt.substring(0, 50)}...`);

    // Capture request payload
    const requestPayload = {
        prompt,
        image_size: imageSize,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false
    };

    const requestMetadata = {
        provider: 'fal',
        model,
        prompt,
        aspectRatio,
        imageSize
    };

    // Use queue endpoint for reliability
    const result = await postToFalQueue(model, requestPayload);

    const duration = Date.now() - startTime;

    if (result.images && result.images.length > 0) {
        const imageUrl = result.images[0].url;
        console.log(`[Fal AI] Image generated: ${imageUrl}`);

        if (includeMetadata) {
            return {
                result: imageUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        imageUrl,
                        width: result.images[0].width,
                        height: result.images[0].height,
                        contentType: result.images[0].content_type,
                        seed: result.seed,
                        hasNsfwConcepts: result.has_nsfw_concepts,
                        timings: result.timings
                    },
                    timestamp: new Date().toISOString(),
                    duration
                }
            };
        }
        return imageUrl;
    }
    throw new Error('No image generated');
}

module.exports = {
    generateImage,
    postToFal,
    postToFalQueue
};
