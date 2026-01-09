/**
 * Unified Provider Handler
 * Handles execution for different AI providers (OpenAI, Fal AI, FFmpeg)
 * with consistent interface and R2 storage integration
 */

const axios = require('axios');
const { uploadBase64ToR2, uploadUrlToR2, isR2Configured } = require('../utils/r2Storage');

const FAL_KEY = process.env.FAL_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Provider Handler class for executing node operations
 */
class ProviderHandler {
    constructor(providerConfig, apiConfig = {}) {
        this.provider = providerConfig?.provider || 'openai';
        this.model = providerConfig?.model || '';
        this.endpoint = providerConfig?.endpoint || '';
        this.requestFormat = apiConfig?.requestFormat || 'json';
        this.headers = apiConfig?.headers || {};
        this.responseType = apiConfig?.responseType || (this.provider === 'fal-ai' ? 'async' : 'sync');
    }

    /**
     * Execute the provider operation
     */
    async execute(nodeType, config) {
        const startTime = Date.now();

        console.log(`[ProviderHandler] Executing ${nodeType} with provider: ${this.provider}`);

        let result;
        switch (this.provider) {
            case 'openai':
                result = await this.executeOpenAI(nodeType, config);
                break;
            case 'fal-ai':
                result = await this.executeFalAI(nodeType, config);
                break;
            case 'ffmpeg':
                result = await this.executeFFmpeg(nodeType, config);
                break;
            default:
                throw new Error(`Unknown provider: ${this.provider}`);
        }

        result.executionTime = Date.now() - startTime;
        return result;
    }

    /**
     * Replace {{variable}} placeholders in headers with config values
     */
    resolveHeaders(config) {
        const resolved = { ...this.headers };
        for (const [key, value] of Object.entries(resolved)) {
            if (typeof value === 'string') {
                resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                    return config[varName] || process.env[varName] || match;
                });
            }
        }
        return resolved;
    }

    /**
     * Execute OpenAI API calls
     */
    async executeOpenAI(nodeType, config) {
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }

        const headers = {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            ...this.resolveHeaders(config)
        };

        let endpoint = this.endpoint;
        let requestBody = {};

        // Determine endpoint and body based on node type
        switch (nodeType) {
            case 'text_to_text':
                endpoint = endpoint || 'https://api.openai.com/v1/chat/completions';
                requestBody = {
                    model: this.model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: config.systemPrompt || 'You are a helpful assistant.' },
                        { role: 'user', content: config.prompt }
                    ],
                    temperature: config.temperature || 0.7
                };
                break;

            case 'text_to_image':
                endpoint = endpoint || 'https://api.openai.com/v1/images/generations';
                requestBody = {
                    model: this.model || 'dall-e-3',
                    prompt: config.prompt,
                    n: 1,
                    size: config.size || '1024x1024',
                    response_format: 'b64_json' // Get base64 to upload to R2
                };
                break;

            case 'image_to_image':
                endpoint = endpoint || 'https://api.openai.com/v1/images/edits';
                // For image editing, we need form-data
                const FormData = require('form-data');
                const formData = new FormData();
                formData.append('image', config.imageUrl);
                formData.append('prompt', config.prompt);
                formData.append('model', this.model || 'dall-e-2');

                const editResponse = await axios.post(endpoint, formData, {
                    headers: {
                        ...headers,
                        ...formData.getHeaders()
                    }
                });

                return this.processOpenAIResponse(editResponse.data, nodeType);
        }

        const response = await axios.post(endpoint, requestBody, { headers });
        return this.processOpenAIResponse(response.data, nodeType);
    }

    /**
     * Process OpenAI API response
     */
    async processOpenAIResponse(data, nodeType) {
        const result = {
            rawResponse: data,
            outputUrl: null,
            outputType: null
        };

        // Handle text responses
        if (data.choices?.[0]?.message?.content) {
            result.text = data.choices[0].message.content;
            result.outputType = 'text';
            return result;
        }

        // Handle image responses (base64)
        if (data.data?.[0]?.b64_json) {
            if (isR2Configured()) {
                try {
                    result.outputUrl = await uploadBase64ToR2(
                        data.data[0].b64_json,
                        `openai_${nodeType}`,
                        'image/png'
                    );
                    result.outputType = 'image';
                    console.log(`[ProviderHandler] Uploaded base64 image to R2: ${result.outputUrl}`);
                } catch (err) {
                    console.error('[ProviderHandler] R2 upload failed:', err.message);
                    // Fall back to returning base64 data URL
                    result.outputUrl = `data:image/png;base64,${data.data[0].b64_json}`;
                }
            } else {
                result.outputUrl = `data:image/png;base64,${data.data[0].b64_json}`;
            }
            return result;
        }

        // Handle image responses (URL)
        if (data.data?.[0]?.url) {
            result.outputUrl = data.data[0].url;
            result.outputType = 'image';

            // Optionally upload to R2 for persistence
            if (isR2Configured()) {
                try {
                    result.outputUrl = await uploadUrlToR2(
                        data.data[0].url,
                        `openai_${nodeType}`,
                        'image/png'
                    );
                    console.log(`[ProviderHandler] Re-uploaded URL to R2: ${result.outputUrl}`);
                } catch (err) {
                    console.error('[ProviderHandler] R2 upload failed, using original URL:', err.message);
                }
            }
            return result;
        }

        return result;
    }

    /**
     * Execute Fal AI API calls (async with polling)
     */
    async executeFalAI(nodeType, config) {
        if (!FAL_KEY) {
            throw new Error('FAL_KEY is not configured');
        }

        const model = this.model || this.getDefaultFalModel(nodeType);
        const headers = {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
            ...this.resolveHeaders(config)
        };

        console.log(`[ProviderHandler] Submitting to Fal AI queue: ${model}`);

        // Build request body based on node type
        const requestBody = this.buildFalRequestBody(nodeType, config);

        // Submit to queue
        const queueResponse = await axios.post(
            `https://queue.fal.run/${model}`,
            requestBody,
            { headers }
        );

        const { request_id, status_url, response_url } = queueResponse.data;
        console.log(`[ProviderHandler] Fal AI request queued: ${request_id}`);

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 450; // 15 minutes max

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            try {
                const statusRes = await axios.get(status_url, { headers });
                const { status } = statusRes.data;

                if (attempts % 10 === 0) {
                    console.log(`[ProviderHandler] Fal AI status: ${status} (attempt ${attempts})`);
                }

                if (status === 'COMPLETED') {
                    const resultRes = await axios.get(response_url, { headers });
                    return this.processFalResponse(resultRes.data, nodeType);
                }

                if (status === 'FAILED') {
                    throw new Error('Fal AI request failed');
                }
            } catch (err) {
                if (err.response?.status !== 202) {
                    throw err;
                }
            }
        }

        throw new Error('Fal AI request timed out');
    }

    /**
     * Get default Fal AI model for node type
     */
    getDefaultFalModel(nodeType) {
        const defaults = {
            'text_to_speech': 'fal-ai/playht/tts/v3',
            'text_to_image': 'fal-ai/flux/schnell',
            'image_to_image': 'fal-ai/stable-diffusion-v3-medium',
            'text_to_video': 'fal-ai/ltxv-13b-098-distilled',
            'image_to_video': 'fal-ai/ltxv-13b-098-distilled/image-to-video',
            'text_to_music': 'fal-ai/stable-audio'
        };
        return defaults[nodeType] || 'fal-ai/flux/schnell';
    }

    /**
     * Build Fal AI request body based on node type
     */
    buildFalRequestBody(nodeType, config) {
        switch (nodeType) {
            case 'text_to_speech':
                return {
                    input: config.text || config.prompt,
                    voice: config.voice || 'alloy'
                };
            case 'text_to_image':
                return {
                    prompt: config.prompt,
                    negative_prompt: config.negativePrompt || '',
                    image_size: config.aspectRatio || 'square'
                };
            case 'image_to_image':
                return {
                    image_url: config.imageUrl,
                    prompt: config.prompt,
                    strength: config.strength || 0.7
                };
            case 'text_to_video':
            case 'image_to_video':
                return {
                    prompt: config.prompt,
                    image_url: config.imageUrl,
                    num_frames: (config.duration || 5) * 24,
                    frame_rate: 24
                };
            case 'text_to_music':
                return {
                    prompt: config.prompt,
                    duration_seconds: config.duration || 10
                };
            default:
                return config;
        }
    }

    /**
     * Process Fal AI response
     */
    processFalResponse(data, nodeType) {
        const result = {
            rawResponse: data,
            outputUrl: null,
            outputType: null
        };

        // Extract output URL based on response structure
        if (data.video?.url) {
            result.outputUrl = data.video.url;
            result.outputType = 'video';
        } else if (data.audio?.url) {
            result.outputUrl = data.audio.url;
            result.outputType = 'audio';
        } else if (data.audio_url) {
            result.outputUrl = data.audio_url;
            result.outputType = 'audio';
        } else if (data.images?.[0]?.url) {
            result.outputUrl = data.images[0].url;
            result.outputType = 'image';
        } else if (data.image?.url) {
            result.outputUrl = data.image.url;
            result.outputType = 'image';
        } else if (data.url) {
            result.outputUrl = data.url;
            result.outputType = 'media';
        }

        console.log(`[ProviderHandler] Fal AI output: ${result.outputUrl}`);
        return result;
    }

    /**
     * Execute FFmpeg operations (calls local API)
     */
    async executeFFmpeg(nodeType, config) {
        const endpoint = this.endpoint || 'http://localhost:8080/ffmpeg/compose';

        console.log(`[ProviderHandler] Calling FFmpeg endpoint: ${endpoint}`);

        const response = await axios.post(endpoint, {
            nodeType,
            ...config
        });

        return {
            rawResponse: response.data,
            outputUrl: response.data.outputUrl,
            outputType: 'video'
        };
    }
}

/**
 * Factory function to create handler from node config
 */
function createProviderHandler(node) {
    return new ProviderHandler(node.providerConfig, node.apiConfig);
}

module.exports = {
    ProviderHandler,
    createProviderHandler
};
