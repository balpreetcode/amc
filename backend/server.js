require('dotenv').config();
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
const { generateImageOpenAI, editImageOpenAI } = require('./generators/openai-image');
const { composeVideo, concatAudioUrls, concatVideoUrls } = require('./generators/ffmpeg');
const db = require('./db');
const { generateToken, verifyToken, getAllTokens, deleteToken } = require('./tokens');
const { validateSessionToken } = require('./mongodb');

const HISTORY_FILE = path.join(__dirname, 'workflow-history.json');
const CONDUCTOR_URL = process.env.CONDUCTOR_URL || 'https://p5200.winds-os.com/api';
const CONTENT_SERVICE_URL = process.env.CONTENT_SERVICE_URL; // Optional external service for face_swap, lip_sync, etc.
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 1000);
const PORT = Number(process.env.PORT || 3002);

const conductor = axios.create({
    baseURL: CONDUCTOR_URL,
    timeout: 30000
});

const app = express();
app.use(cors());
app.use(express.json());

// Serve output folder for videos and audio files
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'output');
app.use('/output', express.static(OUTPUT_DIR));

// API Routes
const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const executionRoutes = require('./routes/executions');
const nodeRoutes = require('./routes/nodes');

app.use('/auth', authRoutes);
app.use('/workflows', workflowRoutes);
app.use('/executions', executionRoutes);
app.use('/nodes', nodeRoutes);

// Session token validation endpoint
app.get('/session/validate', async (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.json({ valid: false, error: 'No token provided' });
    }

    try {
        const result = await validateSessionToken(token);
        res.json(result);
    } catch (error) {
        console.error('[Session] Validation error:', error.message);
        res.json({ valid: false, error: 'Validation failed' });
    }
});

const savedHistoryIds = new Set();

loadHistoryIndex();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        return {
            type: 'text_to_image',
            output: { imageUrl, prompt, aspectRatio },
            apiCalls: [apiCall]
        };
    },
    image_to_image: async (config, previousResults) => {
        const imageUrl = config.imageUrl || getLastOutput(previousResults, 'imageUrl');
        const prompt = config.prompt || 'Enhance this image';

        if (!imageUrl) throw new Error('No input image provided');

        const resultUrl = await editImageOpenAI(imageUrl, prompt, {
            model: config.model || 'gpt-image-1-mini'
        });

        return {
            type: 'image_to_image',
            output: { imageUrl: resultUrl, originalUrl: imageUrl }
        };
    },
    image_to_video: async (config, previousResults) => {
        let imageUrl = config.imageUrl || getLastOutput(previousResults, 'imageUrl');
        const prompt = config.prompt || 'gentle animation with subtle movement';
        const duration = config.duration || 5;

        if (!imageUrl) throw new Error('No input image provided');

        // FIX: Handle array inputs from parallel nodes (e.g., parallel text_to_image)
        if (Array.isArray(imageUrl)) {
            if (imageUrl.length === 0) throw new Error('Empty image array provided');
            console.warn(`[image_to_video] Received array of ${imageUrl.length} images, using first one: ${imageUrl[0]}`);
            imageUrl = imageUrl[0];  // Take first image from array
        }

        const response = await generateVideo(imageUrl, prompt, duration, config.model, true);
        const videoUrl = response.result;
        const apiCall = response.apiCall;

        return {
            type: 'image_to_video',
            output: { videoUrl, sourceImage: imageUrl, duration },
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

        return {
            type: 'text_to_video',
            output: { videoUrl, prompt, duration },
            apiCalls: [apiCall]
        };
    },
    text_to_music: async (config, previousResults) => {
        const prompt = config.prompt || 'Upbeat electronic music';
        let duration = config.duration;

        // Convert string numbers to actual numbers
        if (typeof duration === 'string' && duration !== 'auto') {
            duration = parseInt(duration, 10);
        }

        // Auto-calculate duration from previous video nodes if not specified
        if (!duration || duration === 'auto') {
            console.log('[text_to_music] Auto-calculating duration from previous video nodes...');

            // Calculate total video duration from previous nodes
            let totalVideoDuration = 0;

            // Check for image_to_video and text_to_video nodes with duration config
            previousResults.forEach(result => {
                if (result.success && (result.nodeType === 'image_to_video' || result.nodeType === 'text_to_video')) {
                    const durationData = result.data?.output?.duration || result.data?.config?.duration || 5;

                    // Handle array case (when multiple videos are generated)
                    if (Array.isArray(durationData)) {
                        const sum = durationData.reduce((acc, d) => acc + (Number(d) || 5), 0);
                        totalVideoDuration += sum;
                        console.log(`[text_to_music] Found ${result.nodeType} node: ${durationData.length} videos with total duration: ${sum}s`);
                    } else {
                        // Handle single video case
                        const videoDuration = Number(durationData) || 5;
                        const itemsCount = result.data?.output?.itemsCount || 1;
                        const totalDuration = videoDuration * itemsCount;
                        totalVideoDuration += totalDuration;
                        console.log(`[text_to_music] Found ${result.nodeType} node: ${itemsCount} video(s) × ${videoDuration}s = ${totalDuration}s`);
                    }
                }
            });

            // If no video nodes found, check for split_text segments (each segment becomes a video)
            if (totalVideoDuration === 0) {
                previousResults.forEach(result => {
                    if (result.success && result.nodeType === 'split_text') {
                        const segments = result.data?.output?.segments || [];
                        segments.forEach(segment => {
                            const segmentDuration = segment.duration || 5; // Default 5s per segment
                            totalVideoDuration += segmentDuration;
                        });
                        console.log(`[text_to_music] Found ${segments.length} segments, total duration: ${totalVideoDuration}s`);
                    }
                });
            }

            // Use calculated duration or fallback to 30 seconds
            duration = totalVideoDuration > 0 ? totalVideoDuration : 30;
            console.log(`[text_to_music] Final music duration: ${duration}s`);
        }

        const response = await generateMusic(prompt, duration, config.model, true);
        const audioUrl = response.result;
        const apiCall = response.apiCall;

        return {
            type: 'text_to_music',
            output: { audioUrl, prompt, duration },
            apiCalls: [apiCall]
        };
    },
    text_to_speech: async (config, previousResults) => {
        const text = config.text || getLastOutput(previousResults, 'text') || 'Hello world';
        const voice = config.voice || 'alloy';
        const model = config.model || 'fal-ai/elevenlabs/tts/eleven-v3';
        const language = config.language || 'English';

        const response = await generateSpeech(text, voice, model, true, language);
        const audioUrl = response.result;  // Either external URL (FAL) or filesystem path (OpenAI)
        const apiCall = response.apiCall;

        // Extract translated text from metadata if available
        const translatedText = apiCall?.request?.translatedText || text;

        console.log(`[text_to_speech] Generated audio: ${audioUrl}`);

        return {
            type: 'text_to_speech',
            output: {
                audioUrl,  // Pass through as-is (external URL or filesystem path)
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
            return segments;
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
                    output: { segments: extractedScenes, items: extractedScenes.map(segment => segment.text), totalSegments: extractedScenes.length }
                };
            }
            const segments = buildSegmentsFromArray(items);

            console.log('\n  📤 OUTPUT: Split into', segments.length, 'scenes');
            segments.forEach((segment, index) => {
                console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
            });
            console.log('');

            return {
                type: 'split_text',
                output: { segments, items: segments.map(segment => segment.text), totalSegments: segments.length }
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
            const segments = buildSegmentsFromArray(items);

            console.log('\n  📤 OUTPUT: Split into', segments.length, 'scenes');
            segments.forEach((segment, index) => {
                console.log(`\n    🎬 Scene ${index + 1} (${segment.duration}s):`);
                console.log(`       ${segment.text.substring(0, 150)}${segment.text.length > 150 ? '...' : ''}`);
            });
            console.log('');

            return {
                type: 'split_text',
                output: { segments, items: segments.map(segment => segment.text), totalSegments: segments.length }
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
        const prompt = `Split the following text into ${numSegments} logical segments for video scenes. Return as JSON array with objects containing "index", "text", and "duration" (estimated seconds). Text: "${text.substring(0, 500)}..."`;
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
        const output = { segments, items: segments.map(segment => segment.text), totalSegments: segments.length };

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
        let videoUrl = config.videoUrl || getLastOutput(previousResults, 'videoUrl');
        let speechUrl = config.speechUrl || getLastOutput(previousResults, 'audioUrl');
        const musicUrl = config.musicUrl;

        const speechVolume = config.speechVolume || 1.0;
        const musicVolume = config.musicVolume || 0.3;

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
                if (videoUrls[i]) item.videoUrl = videoUrls[i];
                if (speechUrls[i]) item.speechUrl = speechUrls[i];
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

        const result = await composeVideo({
            videoUrl: finalVideoSource,
            speechUrl: finalSpeechSource,
            musicUrl,
            speechVolume,
            musicVolume,
            subtitleText: config.subtitleText,
            subtitlePosition: config.subtitlePosition,
            subtitleColor: config.subtitleColor,
            subtitleSize: config.subtitleSize
        });

        return {
            type: 'edit_video',
            output: { videoUrl: result.videoUrl, localPath: result.localPath }
        };
    },
    clip_merger: async (config, previousResults) => {
        const clips = config.clips || previousResults
            .filter(r => r.data?.output?.videoUrl)
            .map(r => r.data.output.videoUrl);

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

            // Convert video URLs to relative paths (strip http://localhost:PORT)
            // This ensures URLs work regardless of environment (Docker vs local)
            if (entry.videoUrl && entry.videoUrl.includes('localhost')) {
                const originalUrl = entry.videoUrl;
                try {
                    const urlObj = new URL(entry.videoUrl);
                    entry.videoUrl = urlObj.pathname; // Keep only the path, e.g., /output/composed_XXX.mp4
                    if (entry.videoUrl !== originalUrl) {
                        needsUpdate = true;
                    }
                } catch (e) {
                    // If URL parsing fails, leave as-is
                    console.warn('[History] Failed to parse video URL:', entry.videoUrl);
                }
            }

            savedHistoryIds.add(entry.workflowId);
            return entry;
        });

        // Save updated history if we added videoUrls or converted to relative paths
        if (needsUpdate) {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(updatedHistory, null, 2));
            const withVideo = updatedHistory.filter(e => e.videoUrl).length;
            console.log(`[History] Migrated ${withVideo} entries with video URLs (converted to relative paths)`);
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
                    data: task.status === 'COMPLETED' ? { type: task.taskType, output: task.outputData } : undefined,
                    error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
                }));

                // Extract video URL and convert to relative path if needed
                let videoUrl = null;
                if (status === 'completed') {
                    for (const task of workflow.tasks || []) {
                        if (task.status === 'COMPLETED' &&
                            (task.inputData?.nodeType === 'edit_video' || task.taskType === 'edit_video')) {
                            const rawVideoUrl = task.outputData?.videoUrl || null;
                            if (rawVideoUrl) {
                                // Convert localhost URLs to relative paths
                                if (rawVideoUrl.includes('localhost')) {
                                    try {
                                        const urlObj = new URL(rawVideoUrl);
                                        videoUrl = urlObj.pathname;
                                    } catch (e) {
                                        videoUrl = rawVideoUrl;
                                    }
                                } else {
                                    videoUrl = rawVideoUrl;
                                }
                                break;
                            }
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
                resolved[key] = '${' + taskRef + '.output.' + value.outputKey + '}';
            }
        } else if (value && typeof value === 'object') {
            resolved[key] = mapConfigReferences(value, nodeIdToTaskRef);
        } else {
            resolved[key] = value;
        }
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

function getArrayFields(config) {
    if (!config || typeof config !== 'object') return [];
    return Object.entries(config).filter(([, value]) => Array.isArray(value));
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

function combineOutputs(results, aggregateItems) {
    const outputs = results.map(result => {
        if (result && typeof result === 'object' && result.output && typeof result.output === 'object') {
            return result.output;
        }
        if (result && typeof result === 'object') {
            return result;
        }
        return { value: result };
    });

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
            execution: node.execution || {}
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
    const config = normalizePromptConfig(task.inputData?.config || {});
    const execution = normalizeExecution(task.inputData?.execution);
    const aggregateItems = execution.waitForAll && execution.aggregateItems;
    const nodeId = task.inputData?.nodeId || 'unknown';

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 EXECUTING NODE: ${nodeId}`);
    console.log(`📋 Task Type: ${taskType}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
        const arrayFields = getArrayFields(config);
        console.log(`[DEBUG] Node: ${nodeId}, Array fields detected:`, arrayFields.map(([key, val]) => `${key}(${val.length})`));
        const runOne = async (itemConfig, itemIndex) => {
            if (arrayFields.length > 0) {
                console.log(`\n  ⚙️  Processing item ${itemIndex + 1}...`);
            }
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
                const output = result && result.output ? result.output : {};
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
            const combinedOutput = combineOutputs(results, false);

            await updateTaskStatus(task, 'COMPLETED', {
                ...combinedOutput,
                itemsCount,
                nodeType: taskType
            }, null);

            console.log(`✅ NODE COMPLETED: ${nodeId} (processed ${itemsCount} items)\n`);
            return;
        }

        const result = await runOne(config, 0);
        const output = result && result.output ? result.output : {};
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
        await updateTaskStatus(task, 'FAILED', {}, error.message);
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

    const results = (workflow.tasks || []).map(task => {
        const errorMsg = task.status === 'FAILED'
            ? (task.reasonForIncompletion || task.failureReason || `Task failed with status: ${task.status}`)
            : undefined;
        return {
            nodeId: task.inputData?.nodeId || task.taskReferenceName,
            nodeType: task.inputData?.nodeType || task.taskType,
            success: task.status === 'COMPLETED',
            data: task.status === 'COMPLETED' ? { type: task.taskType, output: task.outputData } : undefined,
            error: errorMsg
        };
    });

    // Extract video URL from results (look for edit_video node) and convert to relative path
    let videoUrl = null;
    if (status === 'completed') {
        for (const task of workflow.tasks || []) {
            if (task.status === 'COMPLETED' &&
                (task.inputData?.nodeType === 'edit_video' || task.taskType === 'edit_video')) {
                const rawVideoUrl = task.outputData?.videoUrl || null;
                if (rawVideoUrl) {
                    // Convert localhost URLs to relative paths
                    if (rawVideoUrl.includes('localhost')) {
                        try {
                            const urlObj = new URL(rawVideoUrl);
                            videoUrl = urlObj.pathname;
                        } catch (e) {
                            videoUrl = rawVideoUrl;
                        }
                    } else {
                        videoUrl = rawVideoUrl;
                    }
                    break;
                }
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
        videoUrl
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
            mockData: startFromNodeId ? mockData : null
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
                data: task.status === 'COMPLETED' ? { type: task.taskType, output: task.outputData } : undefined,
                error: task.status === 'FAILED' ? task.reasonForIncompletion || task.failureReason : undefined
            }));

        maybeSaveHistory(workflow);

        res.json({
            status: mapWorkflowStatus(workflow.status),
            currentNodeId: runningTask?.inputData?.nodeId || null,
            nodeStatuses,
            results,
            error: workflow.reasonForIncompletion || workflow.failureReason || null
        });
    } catch (error) {
        res.status(404).json({ error: 'Workflow execution not found' });
    }
});

app.get('/workflow/history', async (req, res) => {
    try {
        // Sync from Conductor if needed (local < 50 and conductor >= 50)
        const history = await syncHistoryFromConductor();
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
            data: task.status === 'COMPLETED' ? { type: task.taskType, output: task.outputData } : undefined,
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

// GET /templates - Fetch all templates
app.get('/templates', async (req, res) => {
    try {
        const templates = await db.getAllTemplates();
        res.json(templates);
    } catch (err) {
        console.error('[Templates] Error loading templates:', err.message);
        res.status(500).json({ error: 'Failed to load templates' });
    }
});

// GET /template/:id - Fetch single template
app.get('/template/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const template = await db.getTemplateById(id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
    } catch (err) {
        console.error('[Templates] Error loading template:', err.message);
        res.status(500).json({ error: 'Failed to load template' });
    }
});

// POST /template - Create new template
app.post('/template', async (req, res) => {
    try {
        const { name, description, nodes, videoPreview } = req.body;

        if (!name || !nodes || !Array.isArray(nodes)) {
            return res.status(400).json({ error: 'Name and nodes are required' });
        }

        // Check for duplicate names
        const existingTemplate = await db.getTemplateByName(name);
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
            templateVersion: 1
        };

        const createdTemplate = await db.createTemplate(template);

        console.log('[Templates] Created template:', createdTemplate.name);
        res.json({ success: true, template: createdTemplate });
    } catch (err) {
        console.error('[Templates] Error creating template:', err.message);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// PUT /template/:id - Update template
app.put('/template/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, nodes, videoPreview } = req.body;

        // Check if template exists
        const existingTemplate = await db.getTemplateById(id);
        if (!existingTemplate) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Check for duplicate names (excluding current template)
        if (name && name !== existingTemplate.name) {
            const duplicateTemplate = await db.getTemplateByName(name);
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

        const updatedTemplate = await db.updateTemplate(id, updates);

        console.log('[Templates] Updated template:', updatedTemplate.name);
        res.json({ success: true, template: updatedTemplate });
    } catch (err) {
        console.error('[Templates] Error updating template:', err.message);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// DELETE /template/:id - Delete template
app.delete('/template/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await db.deleteTemplate(id);

        if (!deleted) {
            return res.status(404).json({ error: 'Template not found' });
        }

        console.log('[Templates] Deleted template:', id);
        res.json({ success: true });
    } catch (err) {
        console.error('[Templates] Error deleting template:', err.message);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// POST /template/:id/generate - Generate video from template
app.post('/template/:id/generate', async (req, res) => {
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
