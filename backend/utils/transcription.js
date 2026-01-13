/**
 * Transcription Service
 * Uses OpenAI Whisper API to transcribe audio with timestamps
 */

const axios = require('axios');
const fs = require('fs');

// Cache for API responses to avoid re-transcribing same audio
const transcriptionCache = new Map();

/**
 * Get audio duration using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`ffprobe -i "${audioPath}" -show_entries format=duration -v quiet -of csv="p=0"`, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(parseFloat(stdout.trim()));
            }
        });
    });
}

/**
 * Transcribe audio using OpenAI Whisper API
 * @param {string} audioPath - Local path to audio file
 * @param {object} options - Transcription options
 * @param {string} options.language - Language code (optional, auto-detect if null)
 * @param {string} options.apiKey - OpenAI API key
 * @param {string} options.model - Whisper model (default: whisper-1)
 * @returns {Promise<object>} Transcription result with segments
 */
async function transcribeAudio(audioPath, options = {}) {
    const {
        language = null,
        apiKey = process.env.OPENAI_API_KEY,
        model = 'whisper-1'
    } = options;

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for transcription');
    }

    if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Check cache first
    const cacheKey = `${audioPath}-${language || 'auto'}`;
    if (transcriptionCache.has(cacheKey)) {
        console.log('[Transcription] Using cached result');
        return transcriptionCache.get(cacheKey);
    }

    console.log(`[Transcription] Starting: ${audioPath}`);
    console.log(`[Transcription] Language: ${language || 'auto-detect'}`);
    console.log(`[Transcription] Model: ${model}`);

    try {
        // Read audio file
        const audioFile = fs.createReadStream(audioPath);

        // Prepare form data for OpenAI API
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', audioFile);
        form.append('model', model);
        if (language) {
            form.append('language', language);
        }
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities[]', 'segment');
        form.append('timestamp_granularities[]', 'word');

        // Call OpenAI Whisper API
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 300000 // 5 minutes
            }
        );

        const result = response.data;

        // Validate response
        if (!result || (!result.text && !result.segments)) {
            throw new Error('Invalid transcription response from API');
        }

        // Extract word-level timestamps if available
        const words = result.words || [];

        // Normalize segments format
        let segments = result.segments || [];
        if (segments.length === 0 && result.text) {
            // If no segments but we have text, create single segment
            const duration = await getAudioDuration(audioPath);
            segments = [{
                id: 0,
                text: result.text,
                start: 0,
                end: duration
            }];
        }

        // Build segment objects with associated words
        const segmentsWithWords = segments.map(seg => {
            const segmentWords = (seg.words || []).map(w => ({
                word: w.word,
                start: w.start,
                end: w.end
            }));
            return {
                text: seg.text || '',
                start: seg.start || 0,
                end: seg.end || 0,
                words: segmentWords
            };
        });

        // Format output with word-level data
        const transcription = {
            text: result.text || '',
            language: result.language || language,
            segments: segmentsWithWords,
            words: words.map(w => ({
                word: w.word,
                start: w.start,
                end: w.end
            })),
            duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
            hasWordTimestamps: words.length > 0
        };

        console.log(`[Transcription] Complete: ${transcription.segments.length} segments`);
        console.log(`[Transcription] Word timestamps available: ${transcription.hasWordTimestamps ? 'YES' : 'NO'}`);
        console.log(`[Transcription] Total words: ${transcription.words.length}`);
        console.log(`[Transcription] Detected language: ${transcription.language || 'unknown'}`);
        console.log(`[Transcription] Text preview: ${transcription.text.substring(0, 100)}...`);

        // Cache the result
        transcriptionCache.set(cacheKey, transcription);

        return transcription;

    } catch (error) {
        console.error('[Transcription] Error:', error.message);

        if (error.response) {
            const apiError = error.response.data;
            throw new Error(`Whisper API error: ${apiError.error?.message || error.message}`);
        }

        throw error;
    }
}

/**
 * Generate FFmpeg drawtext filters from transcription segments
 * @param {object} transcription - Transcription result
 * @param {object} style - Subtitle style options
 * @returns {Array<string>} Array of FFmpeg filter strings
 */
function generateSubtitleFilters(transcription, style = {}) {
    const {
        position = 'bottom',
        color = '#ffffff',
        size = 24,
        font = 'Arial'
    } = style;

    if (!transcription || !transcription.segments || transcription.segments.length === 0) {
        return [];
    }

    const filters = [];
    const hexColor = color.replace('#', '');

    // Calculate Y position
    let yPos;
    switch (position) {
        case 'top': yPos = 'h*0.1'; break;
        case 'center': yPos = '(h-text_h)/2'; break;
        case 'bottom':
        default: yPos = 'h*0.85'; break;
    }

    // Create a filter for each segment
    transcription.segments.forEach((segment, index) => {
        // Escape special characters for FFmpeg
        const escapedText = segment.text
            .replace(/\\/g, '\\\\\\\\')
            .replace(/'/g, "'\\''")
            .replace(/:/g, '\\:')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}');

        // Create drawtext filter with time-based enable
        const filter = `drawtext=text='${escapedText}':font=${font}:fontsize=${size}:fontcolor=0x${hexColor}:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=black@0.5:boxborderw=5:enable='between(t,${segment.start},${segment.end})'`;

        filters.push(filter);
    });

    return filters;
}

/**
 * Chunk words into subtitle groups for progressive display
 * @param {object} transcription - Transcription result with segments and words
 * @param {number} wordsPerChunk - Maximum words per subtitle (default: 5)
 * @returns {Array<object>} Array of subtitle chunks with text, start, end times
 */
function chunkWordsIntoSubtitles(transcription, wordsPerChunk = 5) {
    if (!transcription || !transcription.words || transcription.words.length === 0) {
        // Fallback: use segments if no word-level data
        return (transcription.segments || []).map(seg => ({
            text: seg.text.trim(),
            start: seg.start,
            end: seg.end
        }));
    }

    const chunks = [];
    const words = transcription.words;

    // Group words into chunks
    for (let i = 0; i < words.length; i += wordsPerChunk) {
        const chunkWords = words.slice(i, i + wordsPerChunk);

        // Get time range from first and last word in chunk
        const start = chunkWords[0].start;
        const end = chunkWords[chunkWords.length - 1].end;

        // Build text by joining words
        const text = chunkWords.map(w => w.word).join(' ');

        chunks.push({
            text: text.trim(),
            start: start,
            end: end
        });
    }

    console.log(`[Transcription] Created ${chunks.length} subtitle chunks from ${words.length} words`);
    return chunks;
}

/**
 * Format time for SRT subtitle file
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.round((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Generate SRT subtitle file content from transcription
 * @param {object} transcription - Transcription result with words and segments
 * @param {number} wordsPerChunk - Maximum words per subtitle (default: 5)
 * @returns {string} SRT formatted content
 */
function generateSRT(transcription, wordsPerChunk = 5) {
    if (!transcription) {
        return '';
    }

    // Use word-level chunking for progressive subtitle display
    const subtitleChunks = chunkWordsIntoSubtitles(transcription, wordsPerChunk);

    if (subtitleChunks.length === 0) {
        return '';
    }

    const lines = [];

    subtitleChunks.forEach((chunk, index) => {
        const startTime = formatSRTTime(chunk.start);
        const endTime = formatSRTTime(chunk.end);
        const text = chunk.text.trim();

        lines.push(String(index + 1));
        lines.push(`${startTime} --> ${endTime}`);
        lines.push(text);
        lines.push(''); // Empty line between entries
    });

    return lines.join('\n');
}

/**
 * Save SRT content to a file
 * @param {string} srtContent - SRT formatted content
 * @param {string} outputPath - Path to save SRT file
 * @returns {Promise<string>} Path to saved SRT file
 */
async function saveSRTFile(srtContent, outputPath) {
    const fs = require('fs').promises;
    await fs.writeFile(outputPath, srtContent, 'utf8');
    console.log(`[Transcription] SRT file saved: ${outputPath}`);
    return outputPath;
}

/**
 * Clear the transcription cache
 */
function clearCache() {
    transcriptionCache.clear();
    console.log('[Transcription] Cache cleared');
}

module.exports = {
    transcribeAudio,
    generateSubtitleFilters,
    generateSRT,
    saveSRTFile,
    chunkWordsIntoSubtitles,
    clearCache
};
