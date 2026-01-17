require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const { generateText, parseJSON } = require('./generators/text');
const { generateImage } = require('./generators/image');
const { generateVideo, generateVideoFromText } = require('./generators/video');
const { generateMusic } = require('./generators/music');
const { generateSpeech } = require('./generators/speech');
const crypto = require('crypto');
const { generateImageOpenAI, editImageOpenAI } = require('./generators/openai-image');
const { composeVideo, concatAudioUrls, concatVideoUrls } = require('./generators/ffmpeg');
const db = require('./db');
const { uploadUrlToR2, isR2Configured, getContentType } = require('./utils/r2Storage');
const { generateToken, verifyToken, getAllTokens, deleteToken } = require('./tokens');
const { validateSessionToken } = require('./mongodb');

const HISTORY_FILE = path.join(__dirname, 'workflow-history.json');
const CONDUCTOR_URL = process.env.CONDUCTOR_URL || 'https://p5300.winds-os.com/api';
const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL; // Optional external service for face_swap, lip_sync, etc.
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 1000);
const PORT = Number(process.env.PORT || 3002);
const CONDUCTOR_TIMEOUT = Number(process.env.CONDUCTOR_TIMEOUT || 300000);

const conductor = axios.create({
    baseURL: CONDUCTOR_URL,
    timeout: CONDUCTOR_TIMEOUT
});

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const PROXY_SECRET = process.env.PROXY_SECRET || 'a_secure_random_32_byte_string_key!!'; // 32 bytes for AES-256
const IV_LENGTH = 16;

function encryptUrl(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    // Ensure key is 32 bytes
    const key = crypto.createHash('sha256').update(String(PROXY_SECRET)).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptUrl(text) {
    if (!text) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = crypto.createHash('sha256').update(String(PROXY_SECRET)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const ENABLE_MEDIA_PROXY = process.env.ENABLE_MEDIA_PROXY === 'true'; // Default to false

function createProxyUrl(originalUrl) {
    if (!originalUrl) return null;

    // Feature flag check: If masking is disabled, return original URL
    if (!ENABLE_MEDIA_PROXY) {
        return originalUrl;
    }

    // Don't proxy if already local or relative
    if (originalUrl.startsWith('http://localhost') || originalUrl.startsWith('/')) {
        return originalUrl;
    }
    try {
        const encrypted = encryptUrl(originalUrl);
        return `${API_BASE_URL}/media-proxy?token=${encodeURIComponent(encrypted)}`;
    } catch (err) {
        console.error('Error creating proxy URL:', err);
        return originalUrl;
    }
}

function resolveOriginalUrl(url) {
    if (!url || typeof url !== 'string') return url;

    // Check if it's our proxy URL
    if (url.includes('/media-proxy?token=')) {
        try {
            const tokenMatch = url.match(/token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
                const encryptedToken = decodeURIComponent(tokenMatch[1]);
                const originalUrl = decryptUrl(encryptedToken);
                if (originalUrl) {
                    return originalUrl;
                }
            }
        } catch (err) {
            console.warn('[Proxy] Failed to resolve original URL:', err.message);
        }
    }
    return url;
}

async function maybeUploadImageToR2(imageUrl, label) {
    if (!imageUrl) {
        return { finalUrl: imageUrl, r2Url: null };
    }

    if (!isR2Configured()) {
        return { finalUrl: createProxyUrl(imageUrl), r2Url: null };
    }

    const publicBase = process.env.R2_PUBLIC_URL;
    if (publicBase && imageUrl.startsWith(publicBase)) {
        return { finalUrl: imageUrl, r2Url: imageUrl };
    }

    try {
        const detectedType = getContentType(imageUrl);
        const contentType = detectedType === 'application/octet-stream' ? 'image/png' : detectedType;
        const uploadedUrl = await uploadUrlToR2(imageUrl, label, contentType);
        return { finalUrl: uploadedUrl, r2Url: uploadedUrl };
    } catch (error) {
        console.error('[R2] Image upload failed:', error.message);
        return { finalUrl: createProxyUrl(imageUrl), r2Url: null };
    }
}

const app = express();
app.use(cors());
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// Serve output folder for videos and audio files
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
app.use('/output', express.static(OUTPUT_DIR));

// Proxy endpoint for masked URLs
app.get('/media-proxy', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Missing token');
    }

    try {
        const targetUrl = decryptUrl(token);
        if (!targetUrl) {
            return res.status(400).send('Invalid token');
        }

        // Validate target URL (optional, but good practice)
        // const allowedDomains = ['fal.ai', 'fal.media', 'cloudflare.com', 'r2.dev'];
        // const urlObj = new URL(targetUrl);
        // if (!allowedDomains.some(d => urlObj.hostname.endsWith(d))) { ... }

        const response = await axios({
            method: 'get',
            url: targetUrl,
            responseType: 'stream'
        });

        // Forward content type header
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        response.data.pipe(res);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send('Failed to fetch resource');
    }
});

// API Routes
const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const executionRoutes = require('./routes/executions');
const nodeRoutes = require('./routes/nodes');
const uploadRoutes = require('./routes/upload');

app.use('/auth', authRoutes);
app.use('/workflows', workflowRoutes);
app.use('/executions', executionRoutes);
app.use('/nodes', nodeRoutes);
app.use('/upload', uploadRoutes);

const { sessionMiddleware } = require('./middleware/session');

// Session token validation endpoint
app.get('/session/validate', async (req, res) => {
    const token = req.query.token;

    if (!token) {
        // DEV BYPASS: Return valid session for dev-user
        return res.json({ valid: true, userId: 'dev-user' });
    }

    try {
        const result = await validateSessionToken(token);
        res.json(result);
    } catch (error) {
        console.error('[Session] Validation error:', error.message);
        res.json({ valid: false, error: 'Validation failed' });
    }
});

// =============================================================================
// COMPOSIO INTEGRATION ROUTES
// Handles OAuth connections for Google Drive and Dropbox
// =============================================================================

const composioUtils = require('./utils/composio');

// Initiate OAuth connection for a user
app.post('/composio/connect', sessionMiddleware, async (req, res) => {
    const { toolkit, callbackUrl } = req.body;
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: 'User ID required. Please log in.' });
    }

    if (!toolkit) {
        return res.status(400).json({ error: 'Toolkit is required (e.g., GOOGLEDRIVE, DROPBOX)' });
    }

    try {
        const result = await composioUtils.initiateOAuthFlow(
            userId,
            toolkit,
            callbackUrl || `${API_BASE_URL}/composio/callback`
        );
        res.json(result);
    } catch (error) {
        console.error('[Composio] Connect error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to initiate OAuth' });
    }
});

// Get connected accounts for a user
app.get('/composio/accounts/:userId', sessionMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { toolkit } = req.query;

    // Security check: users can only view their own accounts
    if (req.userId && req.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const accounts = await composioUtils.getConnectedAccounts(userId, toolkit);
        res.json({ accounts });
    } catch (error) {
        console.error('[Composio] Get accounts error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to get accounts' });
    }
});

// Check connection status
app.get('/composio/status/:connectionId', async (req, res) => {
    const { connectionId } = req.params;

    try {
        const status = await composioUtils.getConnectionStatus(connectionId);
        res.json(status);
    } catch (error) {
        console.error('[Composio] Status check error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to check status' });
    }
});

// Disconnect an account
app.delete('/composio/accounts/:connectionId', sessionMiddleware, async (req, res) => {
    const { connectionId } = req.params;

    try {
        const result = await composioUtils.disconnectAccount(connectionId);
        res.json(result);
    } catch (error) {
        console.error('[Composio] Disconnect error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to disconnect' });
    }
});

// OAuth callback handler
app.get('/composio/callback', (req, res) => {
    // After OAuth completion, redirect to frontend with status
    const success = req.query.status === 'success' || !req.query.error;
    const message = success ? 'Account connected successfully!' : 'Connection failed. Please try again.';

    // Redirect to frontend (close popup or redirect to app)
    res.send(`
        <html>
            <head><title>OAuth Complete</title></head>
            <body>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({ type: 'COMPOSIO_OAUTH_COMPLETE', success: ${success} }, '*');
                        window.close();
                    } else {
                        document.body.innerHTML = '<h2>${message}</h2><p>You can close this window.</p>';
                    }
                </script>
                <h2>${message}</h2>
                <p>You can close this window.</p>
            </body>
        </html>
    `);
});

// List files from connected cloud storage
app.get('/composio/files/:userId', sessionMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { toolkit, folderId } = req.query;

    // Security check: users can only view their own files
    if (req.userId && req.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!toolkit) {
        return res.status(400).json({ error: 'toolkit query parameter is required (GOOGLEDRIVE or DROPBOX)' });
    }

    try {
        const result = await composioUtils.listFiles(userId, toolkit, folderId || null);
        res.json(result);
    } catch (error) {
        console.error('[Composio] List files error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to list files' });
    }
});

// Get download URL for a file
app.get('/composio/files/:userId/download/:fileId', sessionMiddleware, async (req, res) => {
    const { userId, fileId } = req.params;
    const { toolkit } = req.query;

    // Security check
    if (req.userId && req.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!toolkit) {
        return res.status(400).json({ error: 'toolkit query parameter is required' });
    }

    try {
        const result = await composioUtils.getFileDownloadUrl(userId, toolkit, fileId);
        res.json(result);
    } catch (error) {
        console.error('[Composio] Download URL error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to get download URL' });
    }
});

// Upload a file to Google Drive or Dropbox
app.post('/composio/files/:userId/upload', sessionMiddleware, async (req, res) => {
    const { userId } = req.params;
    const { toolkit, fileUrl, fileName, folderId } = req.body;

    // Security check
    if (req.userId && req.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    if (!toolkit) {
        return res.status(400).json({ error: 'toolkit is required (GOOGLEDRIVE or DROPBOX)' });
    }

    if (!fileUrl) {
        return res.status(400).json({ error: 'fileUrl is required' });
    }

    if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
    }

    try {
        const result = await composioUtils.uploadFile(userId, toolkit, fileUrl, fileName, folderId);
        res.json(result);
    } catch (error) {
        console.error('[Composio] Upload file error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
});

const savedHistoryIds = new Set();

loadHistoryIndex();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Detect language from workflow nodes by finding text_to_speech nodes
 * @param {Array} workflowNodes - All workflow nodes
 * @param {string} currentNodeId - Current node ID (to look for preceding nodes)
 * @returns {string|null} Detected language code or null
 */
function detectLanguageFromWorkflow(workflowNodes, currentNodeId) {
    if (!workflowNodes || !Array.isArray(workflowNodes)) {
        return null;
    }

    // Find all text_to_speech nodes that come before the current node
    const ttsNodes = workflowNodes.filter(node =>
        node.type === 'text_to_speech' &&
        node.config &&
        node.config.language
    );

    if (ttsNodes.length > 0) {
        // Return the language from the first TTS node (all scenes use same language)
        const language = ttsNodes[0].config.language;
        console.log(`[Language] Detected from workflow: ${language}`);
        return language;
    }

    return null;
}

const MOCK_ENDPOINTS = {
    face_swap: '/face-swap',
    lip_sync: '/lip-sync',
    ai_avatar: '/ai-avatar',
    enhancer: '/enhancer',
    image_object_removal: '/image-object-removal',
    image_remove_background: '/image-remove-background',
    video_sound_effects: '/video-sound-effects'
};

const nodeProcessors = {
    text_to_text: async (config, previousResults) => {
        const prompt = config.prompt || 'Write a short creative story.';
        const systemPrompt = config.systemPrompt || '';
        const model = config.model || 'gpt-4o-mini';
        const temperature = config.temperature !== undefined ? config.temperature : 0.7;

        // Show FULL input for debugging
        console.log('  📥 INPUT:');
        console.log('    Raw config:', JSON.stringify(config, null, 2));
        if (systemPrompt) {
            console.log(`    System: ${systemPrompt}`);
        }
        if (typeof prompt === 'string') {
            console.log(`    Prompt (FULL):\n${prompt}`);
        } else {
            console.log(`    Prompt (Array/Object): ${JSON.stringify(prompt)}`);
        }
        console.log(`    Temperature: ${temperature}`);

        const response = await generateText(prompt, systemPrompt, model, temperature, true);
        const text = response.result;
        const apiCall = response.apiCall;

        // Show output
        console.log('\n  📤 OUTPUT:');
        console.log(`    ${text}\n`);

        return {
            type: 'text_to_text',
            output: { text, model, tokens: text.length },
            apiCalls: [apiCall]
        };
    },
    text_to_image: async (config) => {
        const prompt = config.prompt || 'A beautiful landscape';
        const aspectRatio = config.aspectRatio || '16:9';
        const provider = config.provider || 'fal';

        let imageUrl, apiCall;
        if (provider === 'openai') {
            const response = await generateImageOpenAI(prompt, {
                model: config.model || 'gpt-image-1-mini',
                size: config.size || '1024x1024',
                includeMetadata: true
            });
            imageUrl = response.result;
            apiCall = response.apiCall;
        } else {
            const response = await generateImage(prompt, aspectRatio, config.model, true);
            imageUrl = response.result;
            apiCall = response.apiCall;
        }

        const { finalUrl: storedImageUrl } = await maybeUploadImageToR2(imageUrl, 'text_to_image');
        return {
            type: 'text_to_image',
            output: {
                imageUrl: storedImageUrl,
                originalImageUrl: imageUrl,
                prompt,
                aspectRatio
            },
            apiCalls: [apiCall]
        };
    },
    image_to_image: async (config, previousResults) => {
        const imageUrls = Array.isArray(config.imageUrls) ? config.imageUrls : null;
        const baseImage = config.imageUrl || getLastOutput(previousResults, 'originalImageUrl') || getLastOutput(previousResults, 'imageUrl');
        const backgroundImages = config.backgroundImages || config.backgroundImage || null;
        const characterImages = config.characterImages || null;

        const extractUrls = (value) => {
            if (!value) return [];
            if (typeof value === 'string') return [value];
            if (Array.isArray(value)) {
                return value.flatMap(item => extractUrls(item));
            }
            if (typeof value === 'object') {
                const candidate = value.imageUrl || value.url || value.originalImageUrl;
                return candidate ? [candidate] : [];
            }
            return [];
        };

        const inputImages = [];
        if (baseImage) {
            inputImages.push(resolveOriginalUrl(baseImage));
        }

        extractUrls(backgroundImages).forEach(url => inputImages.push(resolveOriginalUrl(url)));
        extractUrls(characterImages).forEach(url => inputImages.push(resolveOriginalUrl(url)));

        if (imageUrls && imageUrls.length > 0) {
            inputImages.push(...imageUrls.map(url => resolveOriginalUrl(url)).filter(Boolean));
        }

        const normalizedInputs = Array.from(new Set(inputImages.filter(Boolean)));

        const prompt = config.prompt || 'Enhance this image';

        if (normalizedInputs.length === 0) throw new Error('No input image provided');

        const imageInput = normalizedInputs.length === 1 ? normalizedInputs[0] : normalizedInputs;
        const originalSource = baseImage || normalizedInputs[0] || null;
        const resultUrl = await editImageOpenAI(imageInput, prompt, {
            model: config.model || 'gpt-image-1-mini'
        });

        const { finalUrl: storedImageUrl } = await maybeUploadImageToR2(resultUrl, 'image_to_image');
        return {
            type: 'image_to_image',
            output: {
                imageUrl: storedImageUrl,
                originalImageUrl: resultUrl,
                originalUrl: originalSource // Keep tracking source
            }
        };
    },
    image_to_video: async (config, previousResults) => {
        let imageUrl = config.imageUrl || getLastOutput(previousResults, 'originalImageUrl') || getLastOutput(previousResults, 'imageUrl');

        // Resolve proxy URL to original URL for external API calls
        imageUrl = resolveOriginalUrl(imageUrl);

        const prompt = config.prompt || 'gentle animation with subtle movement';
        const duration = config.duration || 5;

        if (!imageUrl) throw new Error('No input image provided');

        const response = await generateVideo(imageUrl, prompt, duration, config.model, true);
        const videoUrl = response.result;
        const apiCall = response.apiCall;

        const proxyVideoUrl = createProxyUrl(videoUrl);
        return {
            type: 'image_to_video',
            output: {
                videoUrl: proxyVideoUrl,
                originalVideoUrl: videoUrl,
                sourceImage: imageUrl,
                duration
            },
            apiCalls: [apiCall]
        };
    },
    text_to_video: async (config) => {
        const prompt = config.prompt || 'A cinematic scene';
        // Parse duration - handle both "X seconds" string format and numeric values
        let duration = 5;
        if (config.duration) {
            const durationStr = String(config.duration);
            const match = durationStr.match(/(\d+)/);
            duration = match ? parseInt(match[1]) : (parseFloat(config.duration) || 5);
        }
        // Ensure minimum duration of 5 seconds
        duration = Math.max(duration, 5);

        const response = await generateVideoFromText(prompt, duration, config.model, true);
        const videoUrl = response.result;
        const apiCall = response.apiCall;

        const proxyVideoUrl = createProxyUrl(videoUrl);
        return {
            type: 'text_to_video',
            output: {
                videoUrl: proxyVideoUrl,
                originalVideoUrl: videoUrl,
                prompt,
                duration
            },
            apiCalls: [apiCall]
        };
    },
    text_to_music: async (config) => {
        const prompt = config.prompt || 'Upbeat electronic music';
        const duration = config.duration || 30;

        const response = await generateMusic(prompt, duration, config.model, true);
        const audioUrl = response.result;
        const apiCall = response.apiCall;

        const proxyAudioUrl = createProxyUrl(audioUrl);
        return {
            type: 'text_to_music',
            output: {
                audioUrl: proxyAudioUrl,
                originalAudioUrl: audioUrl,
                prompt,
                duration
            },
            apiCalls: [apiCall]
        };
    },
    text_to_speech: async (config, previousResults) => {
        const text = config.text || getLastOutput(previousResults, 'text') || 'Hello world';
        const voice = config.voice || 'alloy';
        const model = config.model || 'fal-ai/chatterbox/text-to-speech/turbo';
        const language = config.language || 'English';

        const response = await generateSpeech(text, voice, model, true, language);
        const audioUrl = response.result;
        const apiCall = response.apiCall;

        // Extract translated text from metadata if available
        const translatedText = apiCall?.request?.translatedText || text;

        return {
            type: 'text_to_speech',
            output: {
                audioUrl: createProxyUrl(audioUrl),
                originalAudioUrl: audioUrl,
                text: translatedText.substring(0, 100),
                originalText: text.substring(0, 100),
                voice,
                language
            },
            apiCalls: [apiCall]
        };

    },
    split_text: async (config, previousResults) => {
        const source = config.text ?? getLastOutput(previousResults, 'text') ?? '';
        const numSegments = Number(config.numSegments || 3);
        const splitModeRaw = (config.splitMode || 'text').toString().toLowerCase();
        const splitMode = splitModeRaw.includes('json') ? 'json_path' : splitModeRaw.includes('array') ? 'array' : 'text';

        console.log('[split_text] Received config:', {
            sourceType: typeof source,
            sourceLength: String(source).length,
            sourcePreview: String(source).substring(0, 200),
            splitMode,
            numSegments
        });

        const extractSceneFromText = (rawText) => {
            const text = String(rawText || '').trim();
            if (!text) {
                return [];
            }

            // Try to detect and extract scenes with markdown formatting
            // Patterns like: **Scene 1**, **🎞️ Scene 1**, **⏱️ Scene 2**
            // Split by scene markers and reconstruct
            const lines = text.split('\n');
            const segments = [];
            let currentScene = null;
            let currentIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if line contains a scene marker like **Scene 1** or **🎞️ Scene 1 (0–5 sec)**
                const sceneMarkerMatch = line.match(/\*\*[^\*]*?(?:Scene|SCENE)\s*(\d+)[^\*]*?\*\*/i);

                if (sceneMarkerMatch) {
                    // Save previous scene if exists
                    if (currentScene !== null && currentScene.text.trim()) {
                        segments.push(currentScene);
                    }

                    // Extract duration if present
                    const durationMatch = line.match(/\((\d+)[–\-](\d+)\s*sec\)/i);
                    const duration = durationMatch ? parseInt(durationMatch[2]) - parseInt(durationMatch[1]) : 10;

                    currentIndex++;
                    currentScene = {
                        index: currentIndex,
                        text: line.trim(),
                        duration: duration
                    };
                } else if (currentScene !== null && line.trim()) {
                    // Add content to current scene
                    currentScene.text += '\n' + line;
                }
            }

            // Don't forget the last scene
            if (currentScene !== null && currentScene.text.trim()) {
                segments.push(currentScene);
            }

            if (segments.length > 0) {
                return segments;
            }

            return [];
        };

        const fallbackSegmentsFromText = (rawText) => {
            const cleaned = String(rawText || '').trim();
            if (!cleaned) {
                return [{ index: 0, text: '', duration: 10 }];
            }

            // First try to extract pre-formatted scenes
            const extractedScenes = extractSceneFromText(cleaned);
            if (extractedScenes.length > 0) {
                return extractedScenes;
            }

            // Fall back to sentence-based splitting
            const normalizedText = cleaned.replace(/\s+/g, ' ');
            const sentences = normalizedText.split(/(?<=[.!?])\s+/).filter(Boolean);
            const target = Math.max(1, numSegments);
            const chunkSize = Math.ceil(sentences.length / target);
            const segments = [];
            for (let i = 0; i < target; i++) {
                const chunk = sentences.slice(i * chunkSize, (i + 1) * chunkSize);
                if (chunk.length === 0) {
                    break;
                }
                segments.push({ index: i, text: chunk.join(' '), duration: 10 });
            }
            return segments.length > 0 ? segments : [{ index: 0, text: cleaned, duration: 10 }];
        };

        const getValueByPath = (obj, path) => {
            if (!path) return undefined;
            const cleaned = path.replace(/^\$?\.*response\./, '').replace(/^\$?\./, '');
            return cleaned
                .split('.')
                .filter(Boolean)
                .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
        };

        const buildSegmentsFromArray = (items) => {
            let slicedItems = items;
            if (numSegments > 0 && items.length > numSegments) {
                slicedItems = items.slice(0, numSegments);
            }
            const segments = slicedItems.map((item, index) => {
                if (item && typeof item === 'object') {
                    return {
                        index,
                        text: item.text ?? JSON.stringify(item),
                        duration: Number(item.duration || 10)
                    };
                }
                return { index, text: String(item), duration: 10 };
            });
            return { segments, rawItems: slicedItems };
        };

        if (splitMode === 'array') {
            let items = source;
            if (typeof items === 'string') {
                // First try to extract scenes from formatted text
                const extractedScenes = extractSceneFromText(items);
                if (extractedScenes.length > 0) {
                    console.log('[split_text] Array mode: extracted', extractedScenes.length, 'scenes from formatted text');
                    const output = {
                        segments: extractedScenes,
                        items: extractedScenes.map(segment => segment.text),
                        itemsRaw: extractedScenes,
                        totalSegments: extractedScenes.length
                    };

                    console.log('\n  📤 OUTPUT: Split into', extractedScenes.length, 'scenes');
                    extractedScenes.forEach((segment, index) => {
                        console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                        console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
                    });
                    console.log('');

                    return {
                        type: 'split_text',
                        output
                    };
                }

                // If no scenes found, try parsing as JSON
                const parsed = parseJSON(items, () => []);
                items = parsed;
            }
            if (!Array.isArray(items)) {
                throw new Error('Split mode "array" requires array input');
            }
            if (items.length === 0) {
                console.log('[split_text] Array mode: got empty array, falling back to text extraction');
                const extractedScenes = fallbackSegmentsFromText(source);

                console.log('\n  📤 OUTPUT: Split into', extractedScenes.length, 'scenes');
                extractedScenes.forEach((segment, index) => {
                    console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                    console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
                });
                console.log('');

                return {
                    type: 'split_text',
                    output: {
                        segments: extractedScenes,
                        items: extractedScenes.map(segment => segment.text),
                        itemsRaw: extractedScenes,
                        totalSegments: extractedScenes.length
                    }
                };
            }
            const { segments, rawItems } = buildSegmentsFromArray(items);

            console.log('\n  📤 OUTPUT: Split into', segments.length, 'scenes');
            segments.forEach((segment, index) => {
                console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
            });
            console.log('');

            return {
                type: 'split_text',
                output: {
                    segments,
                    items: segments.map(segment => segment.text),
                    itemsRaw: rawItems,
                    totalSegments: segments.length
                }
            };
        }

        if (splitMode === 'json_path') {
            let payload = source;
            if (typeof payload === 'string') {
                payload = parseJSON(payload, () => ({}));
            }
            const items = getValueByPath(payload, config.arrayPath);
            if (!Array.isArray(items)) {
                throw new Error('Array path did not resolve to an array');
            }
            const { segments, rawItems } = buildSegmentsFromArray(items);

            console.log('\n  📤 OUTPUT: Split into', segments.length, 'scenes');
            segments.forEach((segment, index) => {
                console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
            });
            console.log('');

            return {
                type: 'split_text',
                output: {
                    segments,
                    items: segments.map(segment => segment.text),
                    itemsRaw: rawItems,
                    totalSegments: segments.length
                }
            };
        }

        const text = Array.isArray(source) ? source.join('\n') : String(source);

        // First, try to extract pre-formatted scenes from the text
        const preFormattedScenes = extractSceneFromText(text);
        console.log('[split_text] Extracted pre-formatted scenes:', preFormattedScenes.length);

        if (preFormattedScenes.length > 0) {
            const output = {
                segments: preFormattedScenes,
                items: preFormattedScenes.map(segment => segment.text),
                itemsRaw: preFormattedScenes,
                totalSegments: preFormattedScenes.length
            };
            console.log('[split_text] Returning output with', output.items.length, 'items');

            console.log('\n  📤 OUTPUT: Split into', preFormattedScenes.length, 'scenes');
            preFormattedScenes.forEach((segment, index) => {
                console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
            });
            console.log('');

            return {
                type: 'split_text',
                output
            };
        }

        // If no pre-formatted scenes found, ask AI to split the text
        console.log('[split_text] No pre-formatted scenes found, using AI to split');
        const prompt = `Split the following text into ${numSegments} logical segments for video scenes. Return as JSON array with objects containing "index", "text", and "duration" (estimated seconds). Text: "${text.substring(0, 50000)}..."`;
        const result = await generateText(prompt, 'You are a text segmentation assistant. Respond ONLY with a JSON array of objects containing "index", "text", and "duration". Do not add markdown, prose, or emojis.');
        const parsed = parseJSON(result, () => null);
        let segments = Array.isArray(parsed) ? parsed : null;
        if (!segments || segments.length === 0) {
            console.log('[split_text] AI parsing failed, using fallback on AI result');
            segments = fallbackSegmentsFromText(result);
        }
        if (!Array.isArray(segments) || segments.length === 0) {
            console.log('[split_text] Fallback on AI result failed, using fallback on original text');
            segments = fallbackSegmentsFromText(text);
        }

        console.log('[split_text] Final segments count:', segments.length);
        const output = {
            segments,
            items: segments.map(segment => segment.text),
            itemsRaw: segments,
            totalSegments: segments.length
        };

        // Console log for split scenes
        console.log('\n  📤 OUTPUT: Split into', segments.length, 'scenes');
        segments.forEach((segment, index) => {
            console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
            console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
        });
        console.log('');

        return {
            type: 'split_text',
            output
        };
    },
    edit_video: async (config, previousResults) => {
        let items = Array.isArray(config.items) ? config.items : null;
        let videoUrl = config.videoUrl || getLastOutput(previousResults, 'originalVideoUrl') || getLastOutput(previousResults, 'videoUrl');
        let speechUrl = config.speechUrl || getLastOutput(previousResults, 'originalAudioUrl') || getLastOutput(previousResults, 'audioUrl');

        // Resolve proxy URLs
        videoUrl = resolveOriginalUrl(videoUrl);
        speechUrl = resolveOriginalUrl(speechUrl);

        const musicUrl = config.musicUrl;

        const speechVolume = config.speechVolume || 1.0;
        const musicVolume = config.musicVolume || 0.3;

        // Auto-subtitle support: detect language from previous text_to_speech results
        let detectedLanguage = null;
        if (config.enableAutoSubtitles && !config.subtitleLanguage) {
            // Look for language in previous text_to_speech node results
            for (let i = 0; i < previousResults.length; i++) {
                const result = previousResults[i];
                if (result.data?.output?.language) {
                    detectedLanguage = result.data.output.language;
                    console.log(`[edit_video] Detected language from previous TTS node: ${detectedLanguage}`);
                    break;
                }
            }
        }

        // Handle case where videoUrl and speechUrl are arrays (from parallel node execution)
        // Convert them to items format for concatenation
        if (!items && Array.isArray(videoUrl)) {
            console.log('[edit_video] Converting array inputs to items format');
            const videoUrls = videoUrl;
            const speechUrls = Array.isArray(speechUrl) ? speechUrl : [];
            const maxLength = Math.max(videoUrls.length, speechUrls.length);

            items = [];
            for (let i = 0; i < maxLength; i++) {
                const item = {};
                if (videoUrls[i]) item.videoUrl = resolveOriginalUrl(videoUrls[i]);
                if (speechUrls[i]) item.speechUrl = resolveOriginalUrl(speechUrls[i]);
                items.push(item);
            }
            console.log(`[edit_video] Created ${items.length} items from arrays`);
            // Clear the single URL variables since we're using items
            videoUrl = null;
            speechUrl = null;
        }

        let mergedVideoPath = null;
        let mergedSpeechPath = null;
        let finalVideoSource = videoUrl;
        let finalSpeechSource = speechUrl;

        if (items) {
            const videoUrls = items.map(item => item.videoUrl).filter(Boolean);
            const speechUrls = items.map(item => item.speechUrl).filter(Boolean);

            if (videoUrls.length === 0) {
                throw new Error('No input videos provided');
            }

            mergedVideoPath = await concatVideoUrls(videoUrls);
            finalVideoSource = mergedVideoPath;

            if (speechUrls.length > 0) {
                mergedSpeechPath = await concatAudioUrls(speechUrls);
                finalSpeechSource = mergedSpeechPath;
            }
        }

        if (!finalVideoSource) throw new Error('No input video provided');

        // Determine subtitle language: manual override > detected > null (auto-detect)
        const subtitleLanguage = config.subtitleLanguage || detectedLanguage || null;

        const result = await composeVideo({
            videoUrl: finalVideoSource,
            speechUrl: finalSpeechSource,
            musicUrl,
            speechVolume,
            musicVolume,
            subtitleText: config.subtitleText,
            subtitlePosition: config.subtitlePosition,
            subtitleColor: config.subtitleColor,
            subtitleSize: config.subtitleSize,
            enableAutoSubtitles: config.enableAutoSubtitles || false,
            subtitleLanguage
        });

        return {
            type: 'edit_video',
            output: {
                videoUrl: createProxyUrl(result.videoUrl),
                originalVideoUrl: result.videoUrl,
                localPath: result.localPath
            }
        };
    },
    clip_merger: async (config, previousResults) => {
        const clips = config.clips || previousResults
            .filter(r => r.data?.output?.videoUrl)
            .map(r => r.data.output.originalVideoUrl || r.data.output.videoUrl);

        if (!clips || clips.length === 0) {
            throw new Error('No video clips to merge');
        }

        return {
            type: 'clip_merger',
            output: {
                videoUrl: clips[clips.length - 1],
                clipsMerged: clips.length,
                note: 'Full merge implementation pending'
            }
        };
    },
    upload_files: async (config) => {
        const files = config.files || [];
        return {
            type: 'upload_files',
            output: {
                files: files.map((f, i) => ({ id: `file_${i}`, name: f.name || `file_${i}`, url: f.url })),
                totalFiles: files.length
            }
        };
    },
    media_ingest: async (config, previousResults) => {
        const { uploadToR2, uploadFromUrl, isR2Configured } = require('./utils/r2Storage');

        const sourceType = config.sourceType || 'Direct Link';
        const url = config.url || '';
        const files = config.files || [];

        console.log('[media_ingest] Processing:', { sourceType, url: url.substring(0, 100) });

        /**
         * Transform cloud storage URLs to direct download URLs
         */
        const transformUrl = (inputUrl, source) => {
            // Google Drive transformation
            if (source === 'Google Drive' || inputUrl.includes('drive.google.com')) {
                // Extract file ID from various Drive URL formats
                const match = inputUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match) {
                    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
                }
                // Handle already formatted download links
                if (inputUrl.includes('uc?export=download')) {
                    return inputUrl;
                }
            }

            // Dropbox transformation
            if (source === 'Dropbox' || inputUrl.includes('dropbox.com')) {
                // Convert www.dropbox.com links to dl.dropboxusercontent.com
                if (inputUrl.includes('www.dropbox.com')) {
                    return inputUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
                }
                // Add dl=1 if not present
                if (!inputUrl.includes('dl=1')) {
                    return inputUrl + (inputUrl.includes('?') ? '&dl=1' : '?dl=1');
                }
            }

            // S3 and Direct Links are used as-is
            return inputUrl;
        };

        /**
         * Detect media type from URL or content-type
         */
        const detectMediaType = (url, contentType) => {
            const urlLower = url.toLowerCase();
            if (urlLower.match(/\.(mp4|mov|avi|webm|mkv)/) || (contentType && contentType.includes('video'))) {
                return 'video';
            }
            if (urlLower.match(/\.(mp3|wav|ogg|m4a|aac)/) || (contentType && contentType.includes('audio'))) {
                return 'audio';
            }
            if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp)/) || (contentType && contentType.includes('image'))) {
                return 'image';
            }
            return 'media';
        };

        // Handle local file upload (passed through from frontend)
        if (sourceType === 'Local Upload' && files.length > 0) {
            console.log('[media_ingest] Processing local files:', files.length);
            // Files are already uploaded via the /upload endpoint, just return them
            const processedFiles = files.map((f, i) => ({
                id: `ingest_${Date.now()}_${i}`,
                name: f.name || `file_${i}`,
                url: createProxyUrl(f.url),
                originalUrl: f.url,
                type: detectMediaType(f.url || f.name, '')
            }));

            return {
                type: 'media_ingest',
                output: {
                    files: processedFiles,
                    url: processedFiles[0]?.url,
                    originalUrl: processedFiles[0]?.originalUrl,
                    totalFiles: processedFiles.length,
                    sourceType: 'local'
                }
            };
        }

        // Handle URL-based sources (Direct Link, Google Drive, Dropbox, S3)
        if (url) {
            const downloadUrl = transformUrl(url, sourceType);
            console.log('[media_ingest] Transformed URL:', downloadUrl.substring(0, 100));

            let finalUrl = downloadUrl;
            let mediaType = detectMediaType(url, '');

            // If R2 is configured, upload the file to R2 for persistence
            if (isR2Configured()) {
                try {
                    console.log('[media_ingest] Uploading to R2...');
                    const timestamp = Date.now();
                    const extension = url.match(/\.([a-zA-Z0-9]+)(\?|$)/)?.[1] || (mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'jpg');
                    const filename = `ingest_${timestamp}.${extension}`;

                    finalUrl = await uploadFromUrl(downloadUrl, filename);
                    console.log('[media_ingest] Uploaded to R2:', finalUrl.substring(0, 80));
                } catch (uploadError) {
                    console.warn('[media_ingest] R2 upload failed, using direct URL:', uploadError.message);
                    // Fall back to direct URL
                }
            }

            return {
                type: 'media_ingest',
                output: {
                    url: createProxyUrl(finalUrl),
                    originalUrl: finalUrl,
                    sourceUrl: url,
                    type: mediaType,
                    sourceType: sourceType.toLowerCase().replace(' ', '_')
                }
            };
        }

        throw new Error('No URL or files provided for media ingest');
    }
};

function loadHistoryIndex() {
    if (!fs.existsSync(HISTORY_FILE)) {
        return;
    }
    try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        const history = JSON.parse(data);

        // Migrate old history entries to add videoUrl if missing
        let needsUpdate = false;
        const currentPort = PORT;
        const updatedHistory = history.map(entry => {
            if (!entry.videoUrl && entry.status === 'completed' && entry.results) {
                // Try to extract videoUrl from results
                for (const result of entry.results) {
                    if (result.success &&
                        result.nodeType === 'edit_video' &&
                        result.data?.output?.videoUrl) {
                        entry.videoUrl = result.data.output.videoUrl;
                        needsUpdate = true;
                        break;
                    }
                }
            }

            // Fix video URLs with wrong port (3001 -> current port)
            if (entry.videoUrl && entry.videoUrl.includes('localhost:3001')) {
                entry.videoUrl = entry.videoUrl.replace('localhost:3001', `localhost:${currentPort}`);
                needsUpdate = true;
            }

            savedHistoryIds.add(entry.workflowId);
            return entry;
        });

        // Save updated history if we added videoUrls or fixed ports
        if (needsUpdate) {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2));
            const withVideo = updatedHistory.filter(e => e.videoUrl).length;
            console.log(`[History] Migrated ${withVideo} entries with video URLs (fixed ports to ${currentPort})`);
        }
    } catch (error) {
        console.error('[History] Failed to load history index:', error.message);
    }
}

function saveExecutionHistory(executionData) {
    try {
        let history = [];
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            history = JSON.parse(data);
        }

        history.unshift(executionData);
        if (history.length > 50) {
            history = history.slice(0, 50);
        }

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        savedHistoryIds.add(executionData.workflowId);
        console.log(`[History] Saved execution for workflow ${executionData.workflowId}`);
    } catch (err) {
        console.error('[History] Failed to save execution history:', err.message);
    }
}

async function syncHistoryFromConductor() {
    try {
        console.log('[History] Checking if sync from Conductor is needed...');

        // Load local history
        let localHistory = [];
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            localHistory = JSON.parse(data);
        }

        const localCount = localHistory.length;
        console.log(`[History] Local history has ${localCount} entries`);

        // Only sync if local history has fewer than 50 entries
        if (localCount >= 50) {
            console.log('[History] Local history is full (50 entries), skipping sync');
            return localHistory;
        }

        // Search for workflows in Conductor
        // Use the search API to get workflow executions
        const searchResponse = await conductor.get('/workflow/search', {
            params: {
                start: 0,
                size: 100,  // Fetch up to 100 to check count
                sort: 'startTime:DESC',
                freeText: '*'  // Search all workflows
            }
        });

        const conductorWorkflows = searchResponse.data.results || [];
        const conductorCount = searchResponse.data.totalHits || conductorWorkflows.length;

        console.log(`[History] Conductor has ${conductorCount} total executions`);

        // Sync needed: local < 50 AND conductor >= 50
        if (conductorCount >= 50) {
            console.log('[History] Syncing workflows from Conductor...');

            // Get existing workflow IDs to avoid duplicates
            const existingIds = new Set(localHistory.map(entry => entry.workflowId));

            // Process workflows from Conductor
            const syncedWorkflows = [];
            for (const workflow of conductorWorkflows) {
                // Skip if already in local history
                if (existingIds.has(workflow.workflowId)) {
                    continue;
                }

                const status = mapWorkflowStatus(workflow.status);
                if (status !== 'completed' && status !== 'failed') {
                    continue;
                }

                const startTime = workflow.startTime ? new Date(workflow.startTime).toISOString() : new Date().toISOString();
                const endTime = workflow.endTime ? new Date(workflow.endTime).toISOString() : new Date().toISOString();
                const durationMs = workflow.endTime && workflow.startTime ? workflow.endTime - workflow.startTime : 0;

                const results = (workflow.tasks || []).map(task => ({
                    nodeId: task.inputData?.nodeId || task.taskReferenceName,
                    nodeType: task.inputData?.nodeType || task.taskType,
                    success: task.status === 'COMPLETED',
                    data: (task.status === 'COMPLETED' || (task.outputData && Object.keys(task.outputData).length > 0)) ? { type: task.taskType, output: task.outputData } : undefined,
                    error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
                }));

                // Extract video URL
                let videoUrl = null;
                if (status === 'completed') {
                    for (const task of workflow.tasks || []) {
                        if (task.status === 'COMPLETED' &&
                            (task.inputData?.nodeType === 'edit_video' || task.taskType === 'edit_video')) {
                            videoUrl = task.outputData?.videoUrl || null;
                            if (videoUrl) break;
                        }
                    }
                }

                syncedWorkflows.push({
                    workflowId: workflow.workflowId,
                    workflowName: workflow.input?.workflowName || 'Untitled Workflow',
                    status,
                    startTime,
                    endTime,
                    durationMs,
                    nodeCount: workflow.tasks?.length || 0,
                    results,
                    videoUrl
                });
            }

            // Merge synced workflows with local history
            const mergedHistory = [...syncedWorkflows, ...localHistory];

            // Keep only the most recent 50
            const finalHistory = mergedHistory.slice(0, 50);

            // Save merged history
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(finalHistory, null, 2));

            console.log(`[History] Synced ${syncedWorkflows.length} new workflows from Conductor`);
            console.log(`[History] Total history now: ${finalHistory.length} entries`);

            // Update saved IDs cache
            finalHistory.forEach(entry => savedHistoryIds.add(entry.workflowId));

            return finalHistory;
        } else {
            console.log(`[History] No sync needed (Conductor has ${conductorCount} < 50)`);
            return localHistory;
        }
    } catch (error) {
        console.error('[History] Failed to sync from Conductor:', error.message);
        // Return local history on error
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            return JSON.parse(data);
        }
        return [];
    }
}

function mapTaskStatus(status) {
    switch (status) {
        case 'IN_PROGRESS':
        case 'RUNNING':
            return 'running';
        case 'COMPLETED':
            return 'completed';
        case 'FAILED':
            return 'failed';
        default:
            return 'pending';
    }
}

function mapWorkflowStatus(status) {
    switch (status) {
        case 'RUNNING':
            return 'running';
        case 'COMPLETED':
            return 'completed';
        case 'FAILED':
            return 'failed';
        case 'PAUSED':
        case 'SCHEDULED':
        default:
            return 'pending';
    }
}

function getLastOutput(previousResults, key) {
    for (let i = previousResults.length - 1; i >= 0; i--) {
        const output = previousResults[i]?.data?.output;
        if (output && output[key]) {
            return output[key];
        }
    }
    return null;
}

function mapConfigReferences(config, nodeIdToTaskRef) {
    if (!config || typeof config !== 'object') return config;

    if (Array.isArray(config)) {
        return config.map(value => mapConfigReferences(value, nodeIdToTaskRef));
    }

    const resolved = {};
    Object.entries(config).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value._type === 'reference') {
            const taskRef = nodeIdToTaskRef.get(value.nodeId);
            if (!taskRef || !value.outputKey) {
                resolved[key] = null;
            } else {
                // Build reference expression with optional jsonPath
                let refExpr = '${' + taskRef + '.output.' + value.outputKey;
                if (value.jsonPath) {
                    // If jsonPath is provided, append it to access nested data
                    refExpr += '.' + value.jsonPath;
                }
                refExpr += '}';
                resolved[key] = refExpr;
            }
        } else if (value && typeof value === 'object' && value._type === 'filteredReference') {
            // Filtered references are resolved at runtime by the worker
            // We need to transform node IDs to task references for Conductor
            const sourceTaskRef = nodeIdToTaskRef.get(value.sourceNode);
            const filterConfig = value.filterConfig || {};

            // Transform matchFrom reference if it exists
            let transformedMatchFrom = filterConfig.matchFrom;
            if (filterConfig.matchFrom && filterConfig.matchFrom._type === 'reference') {
                const matchFromTaskRef = nodeIdToTaskRef.get(filterConfig.matchFrom.nodeId);
                if (matchFromTaskRef) {
                    transformedMatchFrom = {
                        ...filterConfig.matchFrom,
                        taskRef: matchFromTaskRef,
                        // Build Conductor expression for runtime resolution
                        _conductorExpr: '${' + matchFromTaskRef + '.output.' + filterConfig.matchFrom.outputKey + '}'
                    };
                }
            }

            resolved[key] = {
                _type: 'filteredReference',
                _runtimeResolve: true, // Flag for runtime resolution
                sourceNode: value.sourceNode,
                sourceTaskRef: sourceTaskRef,
                sourceField: value.sourceField,
                sourceExpr: sourceTaskRef ? '${' + sourceTaskRef + '.output.' + (value.sourceField || 'items') + '}' : null,
                filterConfig: {
                    ...filterConfig,
                    matchFrom: transformedMatchFrom
                }
            };
        } else if (value && typeof value === 'object') {
            resolved[key] = mapConfigReferences(value, nodeIdToTaskRef);
        } else {
            resolved[key] = value;
        }
    });

    return resolved;
}

// Rewriting function to be context-aware
function resolveRuntimeReferences(config, rootConfig = null, context = {}) {
    if (!config || typeof config !== 'object') return config;
    if (!rootConfig) rootConfig = config;

    if (Array.isArray(config)) {
        return config.map(item => resolveRuntimeReferences(item, rootConfig, context));
    }

    if (config._type === 'filteredReference' && config._runtimeResolve) {
        const sourceData = config.sourceExpr;
        let matchValues = config.filterConfig.matchValues;
        const itemIndex = context.itemIndex;

        // 1. Try Conductor resolved expression
        if (config.filterConfig.matchFrom && config.filterConfig.matchFrom._conductorExpr) {
            matchValues = config.filterConfig.matchFrom._conductorExpr;
        }

        const matchKey = config.filterConfig.matchFrom?.outputKey;
        const hasSiblingMatch = matchKey && rootConfig && Object.prototype.hasOwnProperty.call(rootConfig, matchKey);
        const isTemplateString = typeof matchValues === 'string' && matchValues.trim().startsWith('${') && matchValues.trim().endsWith('}');
        let isArrayOfArrays = Array.isArray(matchValues) && matchValues.length > 0 && Array.isArray(matchValues[0]);

        // 2. Prefer per-item sibling values when available or when unresolved/global arrays are detected
        if (hasSiblingMatch && (isTemplateString || isArrayOfArrays)) {
            matchValues = rootConfig[matchKey];
        }

        // 3. Fallback: Search in rootConfig (sibling inputs)
        if ((!matchValues || (Array.isArray(matchValues) && matchValues.length === 0)) && config.filterConfig.matchFrom) {
            const keyToFind = config.filterConfig.matchFrom.outputKey;
            // Search immediate children of rootConfig
            for (const val of Object.values(rootConfig)) {
                if (val && typeof val === 'object' && val[keyToFind]) {
                    matchValues = val[keyToFind];
                    console.log(`  🔍 Found match value for '${keyToFind}' in sibling input`);
                    break;
                }
            }
        }

        // Re-check after fallbacks
        isArrayOfArrays = Array.isArray(matchValues) && matchValues.length > 0 && Array.isArray(matchValues[0]);

        // 4. If Conductor resolved to an array of arrays, align to current item
        if (isArrayOfArrays && typeof itemIndex === 'number' && Array.isArray(matchValues[itemIndex])) {
            matchValues = matchValues[itemIndex];
        }

        console.log(`  🔍 Resolving Filtered Reference: Field=${config.filterConfig.field} Op=${config.filterConfig.operator}`);

        return applyFilteredReference({
            sourceData,
            filterField: config.filterConfig.field,
            operator: config.filterConfig.operator,
            matchValues
        });
    }

    const resolved = {};
    Object.keys(config).forEach(key => {
        resolved[key] = resolveRuntimeReferences(config[key], rootConfig, context);
    });
    return resolved;
}

const DEFAULT_EXECUTION = {
    mode: 'parallel',
    waitForAll: false,
    aggregateItems: false
};

function normalizeExecution(execution) {
    if (!execution || typeof execution !== 'object') {
        return { ...DEFAULT_EXECUTION };
    }
    return {
        mode: execution.mode === 'parallel' ? 'parallel' : 'sequential',
        waitForAll: Boolean(execution.waitForAll),
        aggregateItems: Boolean(execution.aggregateItems)
    };
}

const NON_SPLIT_ARRAY_FIELDS = new Set([
    'imageUrls',
    'characters',
    'characterNames',
    'charactersInScene',
    'characterList',
    'sceneCharacters',
    'presentCharacters'
]);

const NON_SPLIT_ARRAY_FIELDS_BY_NODE = {
    image_to_image: ['imageUrls', 'characters', 'characterNames', 'charactersInScene', 'characterList'],
};

function getArrayFields(config, nodeType) {
    if (!config || typeof config !== 'object') return [];

    const noSplit = new Set(NON_SPLIT_ARRAY_FIELDS);
    if (nodeType && NON_SPLIT_ARRAY_FIELDS_BY_NODE[nodeType]) {
        NON_SPLIT_ARRAY_FIELDS_BY_NODE[nodeType].forEach(field => noSplit.add(field));
    }
    if (Array.isArray(config._noSplitFields)) {
        config._noSplitFields.forEach(field => noSplit.add(field));
    }

    return Object.entries(config).filter(([key, value]) => Array.isArray(value) && !noSplit.has(key));
}

// ============================================================================
// OUTPUT MAPPING & FILTERED REFERENCE HELPERS
// ============================================================================

/**
 * Get a nested value from an object using dot notation path
 * @param {object} obj - The object to get value from
 * @param {string} path - Dot-notation path (e.g., 'user.name' or 'items[0].id')
 * @returns {*} The value at the path, or undefined if not found
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;

    // Handle array index notation like 'items[0]'
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const parts = normalizedPath.split('.');

    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

/**
 * Apply output mapping to transform node output
 * Maps input fields and output fields to a new output structure
 * 
 * @param {object} output - The raw output from the node handler
 * @param {object} input - The input config that was passed to the node
 * @param {object} mapping - The output mapping configuration
 *   Example: { 
 *     "imageUrl": "$output.imageUrl",
 *     "characterName": "$input.name",
 *     "staticField": "constant value"
 *   }
 * @returns {object} The mapped output
 */
function applyOutputMapping(output, input, mapping) {
    if (!mapping || typeof mapping !== 'object') return output;

    const mapped = {};

    for (const [key, expression] of Object.entries(mapping)) {
        if (typeof expression === 'string') {
            if (expression.startsWith('$output.')) {
                const field = expression.replace('$output.', '');
                mapped[key] = getNestedValue(output, field);
            } else if (expression.startsWith('$input.')) {
                const field = expression.replace('$input.', '');
                mapped[key] = getNestedValue(input, field);
            } else if (expression === '$output') {
                mapped[key] = output;
            } else if (expression === '$input') {
                mapped[key] = input;
            } else {
                // Static value
                mapped[key] = expression;
            }
        } else {
            // Non-string values are passed through as-is
            mapped[key] = expression;
        }
    }

    // Preserve any output fields not explicitly mapped
    // This ensures we don't lose data if mapping is partial
    return { ...output, ...mapped };
}

/**
 * Apply output mapping to array of outputs (for batch processing)
 * Each output item is mapped with its corresponding input item
 * 
 * @param {Array} outputs - Array of output objects
 * @param {Array} inputs - Array of input configs (same length as outputs)
 * @param {object} mapping - The output mapping configuration
 * @returns {Array} Array of mapped outputs
 */
function applyOutputMappingToArray(outputs, inputs, mapping) {
    if (!mapping || !Array.isArray(outputs)) return outputs;

    return outputs.map((output, index) => {
        const input = Array.isArray(inputs) ? inputs[index] : inputs;
        return applyOutputMapping(output, input, mapping);
    });
}

/**
 * Apply filtered reference - select items from source array based on filter condition
 * Implements WHERE clause functionality
 * 
 * @param {object} filterConfig - The filter configuration
 *   {
 *     sourceData: [...],           // Array to filter from
 *     filterField: "name",         // Field to filter on
 *     operator: "IN",              // IN, EQUALS, CONTAINS
 *     matchValues: [...]           // Values to match against
 *   }
 * @returns {Array} Filtered array
 */
function applyFilteredReference(filterConfig) {
    const { sourceData, filterField, operator, matchValues } = filterConfig;

    if (!Array.isArray(sourceData)) {
        console.warn('[FilteredReference] sourceData is not an array');
        return sourceData;
    }

    if (!filterField || !matchValues) {
        console.warn('[FilteredReference] Missing filterField or matchValues');
        return sourceData;
    }

    const matchSet = Array.isArray(matchValues)
        ? new Set(matchValues.map(v => String(v).toLowerCase()))
        : new Set([String(matchValues).toLowerCase()]);

    return sourceData.filter(item => {
        const fieldValue = getNestedValue(item, filterField);
        if (fieldValue === undefined) return false;

        const normalizedValue = String(fieldValue).toLowerCase();

        switch (operator?.toUpperCase()) {
            case 'IN':
                return matchSet.has(normalizedValue);
            case 'EQUALS':
                return matchSet.has(normalizedValue);
            case 'CONTAINS':
                return Array.from(matchSet).some(v => normalizedValue.includes(v));
            case 'NOT_IN':
                return !matchSet.has(normalizedValue);
            default:
                return matchSet.has(normalizedValue);
        }
    });
}

/**
 * Resolve a filtered reference from config
 * Handles the _type: 'filteredReference' case in mapConfigReferences
 * 
 * @param {object} refConfig - The filtered reference configuration
 * @param {Map} nodeIdToTaskRef - Mapping of node IDs to task references
 * @param {object} previousOutputs - Previous task outputs
 * @returns {Array} Filtered data
 */
function resolveFilteredReference(refConfig, previousOutputs) {
    const { sourceNode, sourceField, filterConfig } = refConfig;

    // Get source data from the specified node
    const sourceOutput = previousOutputs[sourceNode];
    if (!sourceOutput) {
        console.warn(`[FilteredReference] Source node '${sourceNode}' not found in previous outputs`);
        return [];
    }

    const sourceData = sourceField ? getNestedValue(sourceOutput, sourceField) : sourceOutput;
    if (!Array.isArray(sourceData)) {
        console.warn(`[FilteredReference] Source data is not an array`);
        return sourceData;
    }

    // Resolve match values - could be a static array or a reference
    let matchValues = filterConfig.matchValues;
    if (filterConfig.matchFrom) {
        const matchNode = previousOutputs[filterConfig.matchFrom.nodeId];
        if (matchNode) {
            matchValues = getNestedValue(matchNode, filterConfig.matchFrom.outputKey);
        }
    }

    return applyFilteredReference({
        sourceData,
        filterField: filterConfig.field,
        operator: filterConfig.operator,
        matchValues
    });
}

function normalizePromptConfig(config) {
    if (!config || typeof config !== 'object' || !config.concatPrompts) {
        return config;
    }

    const promptFields = ['prompt', 'prompt2', 'prompt3', 'prompt4'];
    const values = promptFields
        .map(field => config[field])
        .filter(value => value !== undefined && value !== null && value !== '');

    if (values.length <= 1) {
        return {
            ...config,
            prompt: values[0] ?? config.prompt
        };
    }

    const hasArray = values.some(Array.isArray);
    let mergedPrompt;

    if (!hasArray) {
        mergedPrompt = values.join('\n\n');
    } else {
        const arrays = values.filter(Array.isArray);
        const length = arrays[0].length;
        arrays.forEach((arr) => {
            if (arr.length !== length) {
                throw new Error('Prompt arrays must be the same length');
            }
        });
        mergedPrompt = Array.from({ length }, (_, index) => (
            values
                .map(value => Array.isArray(value) ? value[index] : value)
                .filter(value => value !== undefined && value !== null && value !== '')
                .join('\n\n')
        ));
    }

    const normalized = { ...config, prompt: mergedPrompt };
    promptFields.slice(1).forEach(field => {
        if (field in normalized) delete normalized[field];
    });

    return normalized;
}

function buildItemConfigs(config, arrayFields) {
    const firstArray = arrayFields[0]?.[1] || [];
    const length = firstArray.length;

    arrayFields.forEach(([key, value]) => {
        if (!Array.isArray(value)) {
            throw new Error(`Input field "${key}" must be an array`);
        }
        if (value.length !== length) {
            throw new Error('Array inputs must be the same length');
        }
    });

    const baseConfig = { ...config };
    arrayFields.forEach(([key]) => {
        delete baseConfig[key];
    });

    const itemConfigs = Array.from({ length }, (_, index) => {
        const itemConfig = { ...baseConfig };
        arrayFields.forEach(([key, value]) => {
            itemConfig[key] = value[index];
        });
        return itemConfig;
    });

    return { itemConfigs, itemsCount: length, baseConfig };
}

async function runItemHandlers(runOne, itemConfigs, mode) {
    if (mode === 'parallel') {
        return Promise.all(itemConfigs.map((config, index) => runOne(config, index)));
    }

    const results = [];
    for (let i = 0; i < itemConfigs.length; i++) {
        results.push(await runOne(itemConfigs[i], i));
    }
    return results;
}

function combineOutputs(results, aggregateItems, outputMapping = null, itemConfigs = null) {
    let outputs = results.map(result => {
        if (result && typeof result === 'object' && result.output && typeof result.output === 'object') {
            return result.output;
        }
        if (result && typeof result === 'object') {
            return result;
        }
        return { value: result };
    });

    // Apply output mapping if provided - preserves input metadata in outputs
    if (outputMapping && itemConfigs) {
        outputs = applyOutputMappingToArray(outputs, itemConfigs, outputMapping);
        console.log(`  📋 Applied output mapping to ${outputs.length} items`);
    }

    // Collect all API calls from results
    const allApiCalls = [];
    results.forEach((result, index) => {
        if (result && result.apiCalls && Array.isArray(result.apiCalls)) {
            result.apiCalls.forEach(apiCall => {
                allApiCalls.push({
                    ...apiCall,
                    callIndex: index + 1
                });
            });
        }
    });

    if (aggregateItems) {
        const aggregated = { items: outputs };
        if (allApiCalls.length > 0) {
            aggregated.apiCalls = allApiCalls;
        }
        return aggregated;
    }

    const combined = { items: outputs };
    outputs.forEach(output => {
        Object.entries(output).forEach(([key, value]) => {
            if (!combined[key]) {
                combined[key] = [];
            }
            combined[key].push(value);
        });
    });

    // Add aggregated API calls
    if (allApiCalls.length > 0) {
        combined.apiCalls = allApiCalls;
    }

    return combined;
}

async function ensureTaskDefinition(taskType) {
    try {
        await conductor.get(`/metadata/taskdefs/${taskType}`);
        return;
    } catch (error) {
        if (error.response?.status !== 404) {
            throw error;
        }
    }

    const taskDef = {
        name: taskType,
        description: `Flow Builder task: ${taskType}`,
        retryCount: 0,
        timeoutSeconds: 3600,
        responseTimeoutSeconds: 3600,
        inputKeys: ['config', 'nodeId', 'nodeType'],
        outputKeys: []
    };

    await conductor.post('/metadata/taskdefs', [taskDef]);
}

async function ensureWorkflowDefinition(workflowDef) {
    try {
        await conductor.post('/metadata/workflow', workflowDef);
    } catch (error) {
        if (error.response?.status === 409) {
            await conductor.put('/metadata/workflow', workflowDef);
        } else {
            throw error;
        }
    }
}

function buildWorkflowDefinition(workflowDefName, nodes) {
    const nodeIdToTaskRef = new Map();
    nodes.forEach((node, index) => {
        nodeIdToTaskRef.set(node.id, `node_${index + 1}`);
    });

    const tasks = nodes.map(node => ({
        name: node.type,
        taskReferenceName: nodeIdToTaskRef.get(node.id),
        type: 'SIMPLE',
        inputParameters: {
            nodeId: node.id,
            nodeType: node.type,
            config: mapConfigReferences(node.config || {}, nodeIdToTaskRef),
            execution: node.execution || {},
            // Pass output mapping configuration
            outputMapping: node.outputMapping || null
        }
    }));

    return {
        name: workflowDefName,
        description: 'Flow Builder dynamic workflow',
        version: 1,
        tasks,
        outputParameters: {},
        schemaVersion: 2,
        ownerEmail: 'noreply@flowbuilder.local'
    };
}

async function startWorkflow(workflowDefName, input) {
    const response = await conductor.post(`/workflow/${workflowDefName}`, input, {
        params: { version: 1 }
    });
    return response.data;
}

async function pollTask(taskType) {
    const response = await conductor.get(`/tasks/poll/${taskType}`, {
        params: { workerid: WORKER_ID }
    });

    if (!response.data || !response.data.taskId) {
        return null;
    }

    return response.data;
}

async function updateTaskStatus(task, status, outputData, reason) {
    await conductor.post('/tasks', {
        taskId: task.taskId,
        workflowInstanceId: task.workflowInstanceId,
        status,
        outputData,
        reasonForIncompletion: reason,
        workerId: WORKER_ID
    });
}

async function callExternalService(nodeType, config, previousResults) {
    if (!CONTENT_SERVICE_URL) {
        throw new Error(`Node type "${nodeType}" requires external content service. Set CONTENT_SERVICE_URL environment variable.`);
    }

    const endpoint = MOCK_ENDPOINTS[nodeType];
    if (!endpoint) {
        throw new Error(`No handler or external endpoint for node type: ${nodeType}`);
    }

    const response = await axios.post(`${CONTENT_SERVICE_URL}${endpoint}`, {
        config,
        previousResults
    });

    return response.data;
}

async function executeTask(task) {
    const taskType = task.taskType || task.taskDefName;
    const handler = nodeProcessors[taskType];

    // Removed top-level resolution to move it to runOne
    let config = normalizePromptConfig(task.inputData?.config || {});
    const execution = normalizeExecution(task.inputData?.execution);
    const aggregateItems = execution.waitForAll && execution.aggregateItems;
    const nodeId = task.inputData?.nodeId || 'unknown';
    const outputMapping = task.inputData?.outputMapping || null;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 EXECUTING NODE: ${nodeId}`);
    console.log(`📋 Task Type: ${taskType}`);
    if (outputMapping) {
        console.log(`📋 Output Mapping: ${Object.keys(outputMapping).join(', ')}`);
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
        const arrayFields = getArrayFields(config, taskType);
        const runOne = async (itemConfig, itemIndex) => {
            if (arrayFields.length > 0) {
                console.log(`\n  ⚙️  Processing item ${itemIndex + 1}...`);
            }

            // JOIN/FILTER Update: Resolve references per item context
            try {
                itemConfig = resolveRuntimeReferences(itemConfig, itemConfig, { itemIndex });
            } catch (e) { console.error('Error resolving runtime ref in runOne:', e); }

            if (handler) {
                return handler(itemConfig, []);
            }
            return callExternalService(taskType, itemConfig, []);
        };

        if (arrayFields.length > 0) {
            const { itemConfigs, itemsCount, baseConfig } = buildItemConfigs(config, arrayFields);

            if (aggregateItems) {
                const aggregateConfig = { ...baseConfig, items: itemConfigs };
                const result = await runOne(aggregateConfig, 0);
                let output = result && result.output ? result.output : {};

                // Apply output mapping for aggregated results
                if (outputMapping) {
                    output = applyOutputMapping(output, aggregateConfig, outputMapping);
                    console.log(`  📋 Applied output mapping to aggregated result`);
                }

                const taskOutput = {
                    ...output,
                    itemsCount,
                    nodeType: result?.type || taskType
                };

                // Include apiCalls if present (fix for missing API call logs)
                if (result && result.apiCalls && Array.isArray(result.apiCalls)) {
                    taskOutput.apiCalls = result.apiCalls;
                }

                await updateTaskStatus(task, 'COMPLETED', taskOutput, null);

                console.log(`✅ NODE COMPLETED: ${nodeId} (aggregated ${itemsCount} items)\n`);
                return;
            }

            const results = await runItemHandlers(runOne, itemConfigs, execution.mode);
            // Pass outputMapping and itemConfigs to combineOutputs for metadata preservation
            const combinedOutput = combineOutputs(results, false, outputMapping, itemConfigs);

            await updateTaskStatus(task, 'COMPLETED', {
                ...combinedOutput,
                itemsCount,
                nodeType: taskType
            }, null);

            console.log(`✅ NODE COMPLETED: ${nodeId} (processed ${itemsCount} items)\n`);
            return;
        }

        const result = await runOne(config, 0);
        let output = result && result.output ? result.output : {};

        // Apply output mapping for single item
        if (outputMapping) {
            output = applyOutputMapping(output, config, outputMapping);
            console.log(`  📋 Applied output mapping`);
        }

        const taskOutput = { ...output, nodeType: result?.type || taskType };

        // Include apiCalls if present (fix for missing API call logs)
        if (result && result.apiCalls && Array.isArray(result.apiCalls)) {
            taskOutput.apiCalls = result.apiCalls;
        }

        await updateTaskStatus(task, 'COMPLETED', taskOutput, null);

        console.log(`✅ NODE COMPLETED: ${nodeId}\n`);
    } catch (error) {
        console.log(`❌ NODE FAILED: ${nodeId}`);
        console.log(`   Error: ${error.message}\n`);

        // Include API call details if available in the error object
        const outputData = {};
        if (error.apiCall) {
            outputData.apiCalls = [error.apiCall];
        }

        // Extract detailed error message from response if available
        let failureReason = error.message;
        const responseData = error.response?.data || error.apiCall?.response;

        if (responseData) {
            // Common patterns for API errors
            const detail = responseData.detail || responseData.message || responseData.error?.message || (responseData.error && typeof responseData.error === 'string' ? responseData.error : null);

            if (detail && typeof detail === 'string') {
                failureReason = `${error.message}: ${detail}`;
            } else if (typeof responseData === 'string') {
                failureReason = `${error.message}: ${responseData}`;
            } else if (detail && typeof detail === 'object') {
                failureReason = `${error.message}: ${JSON.stringify(detail)}`;
            }
        }

        await updateTaskStatus(task, 'FAILED', outputData, failureReason);
    }
}

async function checkAndSaveWorkflowHistory(task) {
    try {
        // After completing a task, check if this was the last task in the workflow
        const workflowId = task.workflowInstanceId;
        if (!workflowId) return;

        // Fetch the full workflow status
        const response = await conductor.get(`/workflow/${workflowId}`);
        const workflow = response.data;

        // Save history if workflow is complete or failed
        maybeSaveHistory(workflow);
    } catch (error) {
        // Don't fail the task if history check fails
        console.error('[History] Failed to check workflow completion:', error.message);
    }
}

function startWorkerPoller(taskType) {
    const loop = async () => {
        while (true) {
            try {
                const task = await pollTask(taskType);
                if (!task) {
                    await delay(POLL_INTERVAL_MS);
                    continue;
                }
                await executeTask(task);

                // After task execution, check if workflow is complete and save history
                await checkAndSaveWorkflowHistory(task);
            } catch (error) {
                console.error(`[Worker] Polling error for ${taskType}:`, error.message);
                await delay(POLL_INTERVAL_MS);
            }
        }
    };

    loop();
}

function maybeSaveHistory(workflow) {
    const workflowId = workflow.workflowId;
    if (!workflowId) return;
    if (savedHistoryIds.has(workflowId)) return;

    const status = mapWorkflowStatus(workflow.status);
    if (status !== 'completed' && status !== 'failed') return;

    const startTime = workflow.startTime ? new Date(workflow.startTime).toISOString() : new Date().toISOString();
    const endTime = workflow.endTime ? new Date(workflow.endTime).toISOString() : new Date().toISOString();
    const durationMs = workflow.endTime && workflow.startTime ? workflow.endTime - workflow.startTime : 0;

    const results = (workflow.tasks || []).map(task => ({
        nodeId: task.inputData?.nodeId || task.taskReferenceName,
        nodeType: task.inputData?.nodeType || task.taskType,
        success: task.status === 'COMPLETED',
        data: (task.status === 'COMPLETED' || (task.outputData && Object.keys(task.outputData).length > 0)) ? { type: task.taskType, output: task.outputData } : undefined,
        error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
    }));

    // Extract video URL from results (look for edit_video node)
    let videoUrl = null;
    if (status === 'completed') {
        for (const task of workflow.tasks || []) {
            if (task.status === 'COMPLETED' &&
                (task.inputData?.nodeType === 'edit_video' || task.taskType === 'edit_video')) {
                videoUrl = task.outputData?.videoUrl || null;
                if (videoUrl) break;
            }
        }
    }

    saveExecutionHistory({
        workflowId,
        workflowName: workflow.input?.workflowName || 'Untitled Workflow',
        status,
        startTime,
        endTime,
        durationMs,
        nodeCount: workflow.tasks?.length || 0,
        results,
        videoUrl,
        nodes: workflow.input?.nodes || []
    });
}

// API Endpoints

app.post('/workflow/run', async (req, res) => {
    try {
        const { nodes, workflowName, startFromNodeId, mockData } = req.body;

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            return res.status(400).json({ error: 'Nodes array is required' });
        }

        // If we're starting from a specific node with mock data, inject it
        let processedNodes = nodes;
        if (startFromNodeId && mockData !== undefined) {
            console.log(`[API] Starting workflow from node ${startFromNodeId} with mock data`);

            // Find the starting node index
            const startNodeIndex = nodes.findIndex(n => n.id === startFromNodeId);
            if (startNodeIndex === -1) {
                return res.status(400).json({ error: 'Start node not found' });
            }

            // Process nodes: inject mock data into the first node's config
            processedNodes = nodes.map((node, idx) => {
                if (idx === 0) {
                    // For the first node (the starting node), we need to replace
                    // any references in its config with actual mock data values
                    const newConfig = { ...node.config };

                    // If mock data is a simple object with known keys, inject them
                    if (mockData && typeof mockData === 'object' && !Array.isArray(mockData)) {
                        // Inject mock data fields into config, replacing references
                        for (const [key, value] of Object.entries(newConfig)) {
                            if (value && typeof value === 'object' && value._type === 'reference') {
                                // Replace reference with mock data value for that output key
                                const outputKey = value.outputKey;
                                if (mockData[outputKey] !== undefined) {
                                    newConfig[key] = mockData[outputKey];
                                } else if (Object.keys(mockData).length === 1) {
                                    // If mock data has only one key, use it
                                    newConfig[key] = Object.values(mockData)[0];
                                }
                            }
                        }
                    }

                    return {
                        ...node,
                        config: newConfig,
                        // Also store the full mock data for the task to use
                        _mockData: mockData
                    };
                }
                return node;
            });
        }

        const uniqueTaskTypes = [...new Set(processedNodes.map(node => node.type))];
        for (const taskType of uniqueTaskTypes) {
            await ensureTaskDefinition(taskType);
        }

        const workflowDefName = `flow_builder_${uuidv4().replace(/-/g, '')}`;
        const workflowDef = buildWorkflowDefinition(workflowDefName, processedNodes);
        await ensureWorkflowDefinition(workflowDef);

        const workflowId = await startWorkflow(workflowDefName, {
            workflowName: workflowName || 'Untitled Workflow',
            startFromNodeId: startFromNodeId || null,
            workflowName: workflowName || 'Untitled Workflow',
            startFromNodeId: startFromNodeId || null,
            mockData: startFromNodeId ? mockData : null,
            nodes: processedNodes // Save snapshot of nodes
        });

        res.json({
            success: true,
            workflowId,
            message: startFromNodeId
                ? `Workflow started from node ${startFromNodeId} with mock data`
                : 'Workflow queued for execution'
        });
    } catch (error) {
        console.error('[API] Error queueing workflow:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/workflow/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await conductor.get(`/workflow/${id}`);
        const workflow = response.data;

        const tasks = workflow.tasks || [];
        const nodeStatuses = tasks.map(task => ({
            id: task.inputData?.nodeId || task.taskReferenceName,
            status: mapTaskStatus(task.status)
        }));

        const runningTask = tasks.find(task => mapTaskStatus(task.status) === 'running');
        const results = tasks
            .filter(task => task.status === 'COMPLETED' || task.status === 'FAILED')
            .map(task => ({
                nodeId: task.inputData?.nodeId || task.taskReferenceName,
                nodeType: task.inputData?.nodeType || task.taskType,
                success: task.status === 'COMPLETED',
                data: (task.status === 'COMPLETED' || (task.outputData && Object.keys(task.outputData).length > 0)) ? { type: task.taskType, output: task.outputData } : undefined,
                error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
            }));

        maybeSaveHistory(workflow);

        res.json({
            status: mapWorkflowStatus(workflow.status),
            currentNodeId: runningTask?.inputData?.nodeId || null,
            nodeStatuses,
            results,
            nodeStatuses,
            results,
            nodes: workflow.input?.nodes || [], // Return saved snapshot
            error: workflow.reasonForIncompletion || workflow.failureReason || null
        });
    } catch (error) {
        res.status(404).json({ error: 'Workflow execution not found' });
    }
});

app.get('/workflow/history', sessionMiddleware, async (req, res) => {
    try {
        // Sync from Conductor if needed (local < 50 and conductor >= 50)
        let history = await syncHistoryFromConductor();

        // Filter by userId if available
        if (req.userId) {
            history = history.filter(entry =>
                entry.userId === req.userId || !entry.userId
            );
        }

        res.json(history);
    } catch (err) {
        console.error('[History] Error fetching history:', err);
        res.status(500).json({ error: 'Failed to read history' });
    }
});

app.get('/workflow/:id/results', async (req, res) => {
    try {
        const { id } = req.params;
        const response = await conductor.get(`/workflow/${id}`);
        const workflow = response.data;

        const results = (workflow.tasks || []).map(task => ({
            nodeId: task.inputData?.nodeId || task.taskReferenceName,
            nodeType: task.inputData?.nodeType || task.taskType,
            success: task.status === 'COMPLETED',
            data: (task.status === 'COMPLETED' || (task.outputData && Object.keys(task.outputData).length > 0)) ? { type: task.taskType, output: task.outputData } : undefined,
            error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
        }));

        res.json({
            status: mapWorkflowStatus(workflow.status),
            results
        });
    } catch (error) {
        res.status(404).json({ error: 'Workflow not found' });
    }
});

// Template functions now use PostgreSQL (see db.js)

// Template API Endpoints

// GET /api/templates - Fetch all templates
app.get('/api/templates', sessionMiddleware, async (req, res) => {
    try {
        const templates = await db.getAllTemplates(req.userId, true);
        res.json(templates);
    } catch (err) {
        console.error('[Templates] Error loading templates:', err.message);
        res.status(500).json({ error: 'Failed to load templates' });
    }
});

// GET /api/template/:id - Fetch single template
app.get('/api/template/:id', sessionMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const template = await db.getTemplateById(id, req.userId);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (err) {
        console.error('[Templates] Error loading template:', err.message);
        res.status(500).json({ error: 'Failed to load template' });
    }
});

// POST /api/template - Create new template
app.post('/api/template', sessionMiddleware, async (req, res) => {
    try {
        const { name, description, nodes, videoPreview } = req.body;

        if (!name || !nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Name and nodes are required' });
        }

        // Check for duplicate names for this user
        const existingTemplate = await db.getTemplateByName(name, req.userId);
        if (existingTemplate) {
            return res.status(409).json({
                error: 'Template with this name already exists',
                suggestion: `${name} (Copy)`
            });
        }

        const template = {
            id: `template-${Date.now()}-${uuidv4().substring(0, 8)}`,
            name,
            description: description || '',
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            videoPreview: videoPreview || '',
            nodes,
            nodeCount: nodes.length,
            templateVersion: 1,
            userId: req.userId || null
        };

        const createdTemplate = await db.createTemplate(template);

        console.log('[Templates] Created template:', createdTemplate.name, 'for user:', req.userId);
        res.json({ success: true, template: createdTemplate });
    } catch (err) {
        console.error('[Templates] Error creating template:', err.message);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// PUT /api/template/:id - Update template
app.put('/api/template/:id', sessionMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, nodes, videoPreview } = req.body;

        // Check if template exists and user has access
        const existingTemplate = await db.getTemplateById(id, req.userId);
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Check for duplicate names (excluding current template)
        if (name && name !== existingTemplate.name) {
            const duplicateTemplate = await db.getTemplateByName(name, req.userId);
            if (duplicateTemplate) {
                return res.status(409).json({ error: 'Template with this name already exists' });
            }
        }

        // Prepare updates
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (nodes !== undefined) updates.nodes = nodes;
        if (videoPreview !== undefined) updates.videoPreview = videoPreview;

        const updatedTemplate = await db.updateTemplate(id, updates, req.userId);

        console.log('[Templates] Updated template:', updatedTemplate.name, 'for user:', req.userId);
        res.json({ success: true, template: updatedTemplate });
    } catch (err) {
        console.error('[Templates] Error updating template:', err.message);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE /api/template/:id - Delete template
app.delete('/api/template/:id', sessionMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await db.deleteTemplate(id, req.userId);

        if (!deleted) {
            return res.status(404).json({ error: 'Template not found' });
        }

        console.log('[Templates] Deleted template:', id, 'for user:', req.userId);
        res.json({ success: true });
    } catch (err) {
        console.error('[Templates] Error deleting template:', err.message);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// POST /api/template/:id/generate - Generate video from template
app.post('/api/template/:id/generate', async (req, res) => {
    try {
        const { id } = req.params;

        const template = await db.getTemplateById(id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Reuse existing workflow execution logic
        const uniqueTaskTypes = [...new Set(template.nodes.map(node => node.type))];
        for (const taskType of uniqueTaskTypes) {
            await ensureTaskDefinition(taskType);
        }

        const workflowDefName = `template_${id.replace(/[^a-zA-Z0-9]/g, '_')}_${uuidv4().replace(/-/g, '')}`;
        const workflowDef = buildWorkflowDefinition(workflowDefName, template.nodes);
        await ensureWorkflowDefinition(workflowDef);

        const workflowId = await startWorkflow(workflowDefName, {
            workflowName: `${template.name} (Template)`,
            templateId: id
        });

        console.log('[Templates] Started workflow from template:', template.name, 'workflowId:', workflowId);
        res.json({
            success: true,
            workflowId,
            message: 'Template workflow queued for execution'
        });
    } catch (error) {
        console.error('[Templates] Error generating from template:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'output', filename);

    console.log('[Download] Requested file:', filename);
    console.log('[Download] File path:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error('[Download] File not found:', filePath);
        return res.status(404).json({ error: 'File not found' });
    }

    // Get file stats
    const stat = fs.statSync(filePath);
    console.log('[Download] File size:', stat.size, 'bytes');

    // Use Express's built-in download method
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('[Download] Error sending file:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        } else {
            console.log('[Download] File sent successfully:', filename);
        }
    });
});

// API Token Management Routes

// Middleware to check for valid token (optional authentication)
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return next(); // Allow unauthenticated access for now
    }

    const result = verifyToken(token);
    if (!result.valid) {
        return res.status(401).json({ error: result.reason });
    }

    req.tokenData = result.token;
    next();
}

// Generate new API token
app.post('/api/tokens', (req, res) => {
    const { name, expiresInDays } = req.body;
    const token = generateToken(name, expiresInDays);
    res.json(token);
});

// List all tokens
app.get('/api/tokens', (req, res) => {
    const tokens = getAllTokens();
    res.json(tokens);
});

// Delete a token
app.delete('/api/tokens/:id', (req, res) => {
    const { id } = req.params;
    const deleted = deleteToken(id);
    if (deleted) {
        res.json({ success: true, message: 'Token deleted' });
    } else {
        res.status(404).json({ error: 'Token not found' });
    }
});

// Get iframe embed URL
app.get('/api/embed-url', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }

    const result = verifyToken(token);
    if (!result.valid) {
        return res.status(401).json({ error: result.reason });
    }

    // Generate iframe embed code
    const baseUrl = process.env.FRONTEND_URL || 'http://workflow.localhost';
    const embedUrl = `${baseUrl}?token=${token}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="800" frameborder="0" allow="fullscreen"></iframe>`;

    res.json({
        embedUrl,
        iframeCode,
        tokenValid: true
    });
});

// FFmpeg Compose API Endpoint
// Composes video from clips and uploads to R2
app.post('/ffmpeg/compose', async (req, res) => {
    try {
        const { clips, transition, bgmUrl, outputFormat = 'mp4', operation = 'compose' } = req.body;
        const { execFFmpegCompose } = require('./generators/ffmpeg');
        const { uploadToR2, isR2Configured } = require('./utils/r2Storage');

        console.log('[FFmpeg API] Compose request:', { clipCount: clips?.length, transition, operation });

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return res.status(400).json({ error: 'Clips array is required' });
        }

        // Execute FFmpeg compose
        const localPath = await execFFmpegCompose(clips, {
            transition: transition || 'crossfade',
            bgmUrl,
            outputFormat
        });

        // Check if we should upload to R2
        if (isR2Configured()) {
            try {
                const buffer = fs.readFileSync(localPath);
                const filename = `composed_${Date.now()}`;
                const publicUrl = await uploadToR2(buffer, filename, `video/${outputFormat}`);

                // Cleanup local file
                fs.unlinkSync(localPath);

                console.log('[FFmpeg API] Uploaded to R2:', publicUrl);
                res.json({ success: true, outputUrl: publicUrl, storage: 'r2' });
            } catch (uploadError) {
                console.error('[FFmpeg API] R2 upload failed, serving locally:', uploadError.message);
                // Fall back to local URL
                const localUrl = `http://localhost:${PORT}/output/${path.basename(localPath)}`;
                res.json({ success: true, outputUrl: localUrl, storage: 'local' });
            }
        } else {
            // R2 not configured, serve locally
            const localUrl = `http://localhost:${PORT}/output/${path.basename(localPath)}`;
            console.log('[FFmpeg API] R2 not configured, serving locally:', localUrl);
            res.json({ success: true, outputUrl: localUrl, storage: 'local' });
        }
    } catch (error) {
        console.error('[FFmpeg API] Compose error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'workflow-backend', conductorUrl: CONDUCTOR_URL });
});

app.listen(PORT, async () => {
    console.log(`🚀 Workflow Backend running on http://localhost:${PORT}`);
    console.log(`🧭 Conductor API at ${CONDUCTOR_URL}`);
    if (CONTENT_SERVICE_URL) {
        console.log(`🔗 External content service at ${CONTENT_SERVICE_URL}`);
    }

    // Initialize PostgreSQL database
    try {
        await db.initializeDatabase();
        console.log('✅ PostgreSQL database initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
    }

    const workerTaskTypes = [...new Set([
        ...Object.keys(nodeProcessors),
        ...Object.keys(MOCK_ENDPOINTS)
    ])];

    workerTaskTypes.forEach(taskType => startWorkerPoller(taskType));
});
