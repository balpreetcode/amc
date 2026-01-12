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
    const queueResponse = await axios.post(
        `https://queue.fal.run/${model}`,
        body,
        {
            headers: {
                'Authorization': `Key ${FAL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    const { request_id, response_url, status_url } = queueResponse.data;
    console.log(`[Fal AI Video] Queued with request_id: ${request_id}`);

    // Poll for completion (video takes longer)
    let attempts = 0;
    const maxAttempts = 450; // 15 minutes max (2s intervals)

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const statusResponse = await axios.get(status_url, {
                headers: { 'Authorization': `Key ${FAL_API_KEY}` }
            });

            const { status } = statusResponse.data;
            if (attempts % 5 === 0) {
                console.log(`[Fal AI Video] Status: ${status} (attempt ${attempts})`);
            }

            if (status === 'COMPLETED') {
                const resultResponse = await axios.get(response_url, {
                    headers: { 'Authorization': `Key ${FAL_API_KEY}` }
                });
                return resultResponse.data;
            } else if (status === 'FAILED') {
                throw new Error('Fal AI video generation failed');
            }
        } catch (error) {
            if (error.response?.status !== 202) {
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
async function generateVideo(imageUrl, prompt = '', duration = 5, model = 'fal-ai/ltx-2-19b/distilled/image-to-video', includeMetadata = false) {
    const urlStr = typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
    console.log(`[Fal AI Video] Image to video from: ${urlStr.substring(0, 50)}...`);

    const frameRate = 24;
    // Cap at 60 seconds (Fal AI ltxv model maximum)
    const cappedDuration = Math.min(duration, 60);
    const numFrames = Math.round(cappedDuration * frameRate);

    console.log(`[Fal AI Video] Requesting ${numFrames} frames (${cappedDuration}s at ${frameRate} fps)`);

    let requestPayload;
    if (model.includes('ltx-2')) {
        requestPayload = {
            image_url: imageUrl,
            prompt: prompt || 'A cinematic scene',
            num_frames: numFrames,
            video_size: "square",
            generate_audio: false,
            use_multiscale: true,
            fps: 24,
            acceleration: "none",
            camera_lora: "none",
            camera_lora_scale: 1,
            negative_prompt: "",
            enable_safety_checker: false,
            video_output_type: "X264 (.mp4)",
            video_quality: "high",
            video_write_mode: "balanced"
        };
    } else {
        requestPayload = {
            image_url: imageUrl,
            prompt: prompt || 'gentle animation with subtle movement',
            num_frames: numFrames,
            frame_rate: frameRate
        };
    }

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

    try {
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
    } catch (error) {
        // Attach metadata to error for debugging/logging
        const apiDuration = Date.now() - startTime;
        error.apiCall = {
            request: requestMetadata,
            response: error.response?.data || { error: error.message },
            timestamp: new Date().toISOString(),
            duration: apiDuration
        };
        throw error;
    }
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
    // Cap at 60 seconds (Fal AI ltxv model maximum)
    const cappedDuration = Math.min(duration, 60);
    const numFrames = Math.round(cappedDuration * frameRate);

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

    try {
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
    } catch (error) {
        // Attach metadata to error for debugging/logging
        const apiDuration = Date.now() - startTime;
        error.apiCall = {
            request: requestMetadata,
            response: error.response?.data || { error: error.message },
            timestamp: new Date().toISOString(),
            duration: apiDuration
        };
        throw error;
    }
}

module.exports = {
    generateVideo,
    generateVideoFromText
};
