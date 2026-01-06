/**
 * Video Generation Module
 * Uses Fal AI for image-to-video generation
 */

const axios = require('axios');

const FAL_API_KEY = process.env.FAL_KEY;

/**
 * Post to Fal AI Queue API with polling
 * @param {string} model - Model identifier
 * @param {object} body - Request body
 * @returns {Promise<object>} API response
 */
async function postToFalQueue(model, body) {
    console.log(`[Fal AI Video] Submitting to queue: ${model}`);

    // Submit to queue
    console.log('[Fal AI Video] Request payload:', JSON.stringify(body, null, 2));
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

        // FIX: Provide detailed error messages to users
        let errorMessage = `Fal AI video generation failed: ${error.message}`;

        // Extract validation error details (for 422 errors)
        if (Array.isArray(errorDetail)) {
            const details = errorDetail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
            errorMessage = `Fal AI validation error: ${details}`;
            console.error('[Fal AI Video] Validation error details:', errorDetail);
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

        // Log full error details for debugging
        console.error('[Fal AI Video] Queue submission error:', {
            status: error.response?.status,
            message: errorMessage,
            detail: errorDetail,
            requestBody: body
        });

        throw new Error(errorMessage);
    }

    const { request_id, response_url, status_url } = queueResponse.data;
    console.log(`[Fal AI Video] Queued with request_id: ${request_id}`);

    // Poll for completion (video takes longer)
    let attempts = 0;
    const maxAttempts = 450; // 15 minutes max (2s intervals)

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const statusResponse = await axios.get(status_url, {
                headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                timeout: 10000 // 10 second timeout for status checks
            });

            const { status } = statusResponse.data;
            if (attempts % 5 === 0) {
                console.log(`[Fal AI Video] Status: ${status} (attempt ${attempts})`);
            }

            if (status === 'COMPLETED') {
                const resultResponse = await axios.get(response_url, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` },
                    timeout: 30000 // 30 second timeout for result retrieval
                });
                return resultResponse.data;
            } else if (status === 'FAILED') {
                throw new Error('Fal AI video generation failed');
            }
        } catch (error) {
            if (error.response?.status !== 202) {
                // Log detailed error for debugging
                console.error('[Fal AI Video] Error details:', {
                    status: error.response?.status,
                    data: JSON.stringify(error.response?.data, null, 2),
                    message: error.message
                });
                throw error;
            }
        }

        attempts++;
    }

    throw new Error('Fal AI video generation timed out');
}

/**
 * Generate video from image
 * @param {string} imageUrl - Source image URL
 * @param {string} prompt - Motion/animation description
 * @param {number} duration - Video duration in seconds
 * @param {string} model - Fal AI model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated video URL or object with result and metadata
 */
async function generateVideo(imageUrl, prompt = '', duration = 5, model = 'fal-ai/ltxv-13b-098-distilled/image-to-video', includeMetadata = false) {
    // Ensure we're not receiving arrays (should be split by server.js)
    if (Array.isArray(imageUrl)) {
        throw new Error(`generateVideo received array imageUrl (length: ${imageUrl.length}). Arrays should be split before calling this function.`);
    }
    if (Array.isArray(prompt)) {
        throw new Error(`generateVideo received array prompt (length: ${prompt.length}). Arrays should be split before calling this function.`);
    }
    if (Array.isArray(duration)) {
        throw new Error(`generateVideo received array duration (length: ${duration.length}). Arrays should be split before calling this function.`);
    }

    const urlStr = typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
    console.log(`[Fal AI Video] Image to video from: ${urlStr.substring(0, 50)}...`);

    const frameRate = 24;

    // FIX: Validate duration (minimum 0.375s = 9 frames, maximum 60s = 1441 frames)
    let validDuration = Number(duration) || 5;
    if (validDuration < 0.375) {
        console.warn(`[Fal AI Video] Duration ${validDuration}s too short, using minimum 0.375s (9 frames)`);
        validDuration = 0.375;
    }

    // Cap at 60 seconds (Fal AI ltxv model maximum)
    const cappedDuration = Math.min(validDuration, 60);

    // FIX: Ensure minimum 9 frames and maximum 100 frames (Fal AI requirement)
    const numFrames = Math.min(100, Math.max(9, Math.round(cappedDuration * frameRate)));

    console.log(`[Fal AI Video] Requesting ${numFrames} frames (${cappedDuration}s at ${frameRate} fps)`);

    const requestPayload = {
        image_url: imageUrl,
        prompt: prompt || 'gentle animation with subtle movement',
        num_frames: numFrames,
        frame_rate: frameRate
    };

    const requestMetadata = {
        provider: 'fal',
        model,
        imageUrl,
        prompt: requestPayload.prompt,
        duration: cappedDuration,
        numFrames,
        frameRate
    };

    const startTime = Date.now();

    const result = await postToFalQueue(model, requestPayload);

    const apiDuration = Date.now() - startTime;

    if (result.video && result.video.url) {
        const videoUrl = result.video.url;
        console.log(`[Fal AI Video] Generated: ${videoUrl}`);

        if (includeMetadata) {
            return {
                result: videoUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        videoUrl,
                        width: result.video.width,
                        height: result.video.height,
                        contentType: result.video.content_type,
                        seed: result.seed,
                        timings: result.timings
                    },
                    timestamp: new Date().toISOString(),
                    duration: apiDuration
                }
            };
        }
        return videoUrl;
    }
    throw new Error('No video generated');
}

/**
 * Generate AI video from text (text-to-video)
 * @param {string} prompt - Video description
 * @param {number} duration - Video duration
 * @param {string} model - Model to use
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated video URL or object with result and metadata
 */
async function generateVideoFromText(prompt, duration = 5, model = 'fal-ai/ltxv-13b-098-distilled', includeMetadata = false) {
    console.log(`[Fal AI Video] Text to video: ${prompt.substring(0, 50)}...`);

    const frameRate = 24;

    // FIX: Validate duration (minimum 0.375s = 9 frames, maximum 60s = 1441 frames)
    let validDuration = Number(duration) || 5;
    if (validDuration < 0.375) {
        console.warn(`[Fal AI Video] Duration ${validDuration}s too short, using minimum 0.375s (9 frames)`);
        validDuration = 0.375;
    }

    // Cap at 60 seconds (Fal AI ltxv model maximum)
    const cappedDuration = Math.min(validDuration, 60);

    // FIX: Ensure minimum 9 frames and maximum 100 frames (Fal AI requirement)
    const numFrames = Math.min(100, Math.max(9, Math.round(cappedDuration * frameRate)));

    console.log(`[Fal AI Video] Requesting ${numFrames} frames (${cappedDuration}s at ${frameRate} fps)`);

    const requestPayload = {
        prompt,
        num_frames: numFrames,
        frame_rate: frameRate
    };

    const requestMetadata = {
        provider: 'fal',
        model,
        prompt,
        duration: cappedDuration,
        numFrames,
        frameRate
    };

    const startTime = Date.now();

    const result = await postToFalQueue(model, requestPayload);

    const apiDuration = Date.now() - startTime;

    if (result.video && result.video.url) {
        const videoUrl = result.video.url;
        console.log(`[Fal AI Video] Generated: ${videoUrl}`);

        if (includeMetadata) {
            return {
                result: videoUrl,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        videoUrl,
                        width: result.video.width,
                        height: result.video.height,
                        contentType: result.video.content_type,
                        seed: result.seed,
                        timings: result.timings
                    },
                    timestamp: new Date().toISOString(),
                    duration: apiDuration
                }
            };
        }
        return videoUrl;
    }
    throw new Error('No video generated');
}

module.exports = {
    generateVideo,
    generateVideoFromText
};
