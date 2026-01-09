/**
 * FFmpeg Utilities Module
 * Handles video processing with FFmpeg
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Base directories - relative to project root
// Use __filename to ensure correct path resolution regardless of execution environment
const BASE_DIR = path.dirname(path.dirname(path.dirname(__filename)));
const OUTPUT_DIR = path.join(BASE_DIR, 'output');
const TEMP_DIR = path.join(BASE_DIR, 'temp');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Download a file from URL to local path
 * @param {string} url - Source URL
 * @param {string} destPath - Destination path
 * @returns {Promise<string>} Downloaded file path
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        // Check if it's a local file path (starts with / or contains full path)
        const isLocalPath = url.startsWith('/') || url.startsWith('.') || !url.includes('://');

        if (isLocalPath && fs.existsSync(url)) {
            console.log(`[downloadFile] Copying local file: ${url} -> ${destPath}`);
            fs.copyFile(url, destPath, (err) => {
                if (err) {
                    console.error(`[downloadFile] Copy failed:`, err.message);
                    reject(err);
                    return;
                }
                // Verify the copied file exists and has size
                const stats = fs.statSync(destPath);
                if (stats.size === 0) {
                    reject(new Error(`Copied file is empty: ${destPath}`));
                    return;
                }
                console.log(`[downloadFile] Successfully copied ${stats.size} bytes`);
                resolve(destPath);
            });
            return;
        }

        // It's a URL - download it
        if (!url.includes('://')) {
            reject(new Error(`Invalid URL or file not found: ${url}`));
            return;
        }

        console.log(`[downloadFile] Downloading from URL: ${url}`);
        const file = fs.createWriteStream(destPath);
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlink(destPath, () => { });
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => { });
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(destPath);
                console.log(`[downloadFile] Downloaded ${stats.size} bytes`);
                resolve(destPath);
            });
        }).on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

/**
 * Execute FFmpeg command
 * @param {string} command - FFmpeg command to execute
 * @returns {Promise<string>} Command output
 */
function runFFmpeg(command) {
    return new Promise((resolve, reject) => {
        console.log('Running FFmpeg:', command);
        exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                console.error('FFmpeg error:', stderr);
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function concatVideoUrls(urls) {
    if (!urls || urls.length === 0) {
        throw new Error('No video URLs provided for concatenation');
    }
    if (urls.length === 1) {
        return urls[0];
    }

    const timestamp = Date.now();
    const localPaths = [];
    const inputArgs = [];

    for (let i = 0; i < urls.length; i++) {
        const localPath = path.join(TEMP_DIR, `concat_video_${timestamp}_${i}.mp4`);
        await downloadFile(urls[i], localPath);
        localPaths.push(localPath);
        inputArgs.push(`-i "${localPath}"`);
    }

    const concatInputs = localPaths.map((_, index) => `[${index}:v]`).join('');
    const outputPath = path.join(TEMP_DIR, `concat_video_${timestamp}.mp4`);
    const filter = `"${concatInputs}concat=n=${localPaths.length}:v=1:a=0[v]"`;
    const command = `ffmpeg -y ${inputArgs.join(' ')} -filter_complex ${filter} -map "[v]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

    await runFFmpeg(command);
    localPaths.forEach(filePath => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    return outputPath;
}

async function concatAudioUrls(urls) {
    if (!urls || urls.length === 0) {
        throw new Error('No audio URLs provided for concatenation');
    }
    if (urls.length === 1) {
        return urls[0];
    }

    const timestamp = Date.now();
    const listPath = path.join(TEMP_DIR, `concat_audio_${timestamp}.txt`);
    const outputPath = path.join(TEMP_DIR, `concat_audio_${timestamp}.mp3`);
    const localPaths = [];

    for (let i = 0; i < urls.length; i++) {
        const localPath = path.join(TEMP_DIR, `concat_audio_${timestamp}_${i}.mp3`);
        await downloadFile(urls[i], localPath);
        localPaths.push(localPath);
    }

    const listContent = localPaths.map(filePath => `file '${filePath.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:a libmp3lame "${outputPath}"`;
    await runFFmpeg(command);

    localPaths.forEach(filePath => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);

    return outputPath;
}

/**
 * Get audio duration using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} Duration in seconds
 */
function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
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
 * Cut video to specified duration
 * @param {string} inputPath - Input video path
 * @param {string} outputPath - Output video path
 * @param {number} duration - Target duration in seconds
 * @returns {Promise<string>} Output path
 */
async function cutVideo(inputPath, outputPath, duration) {
    await runFFmpeg(`ffmpeg -y -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`);
    return outputPath;
}

/**
 * Generate video transition between two images
 * @param {string} image1Path - First image path
 * @param {string} image2Path - Second image path
 * @param {string} outputPath - Output video path
 * @param {number} duration - Duration in seconds
 * @param {string} transitionType - Type of transition
 * @returns {Promise<string>} Output path
 */
async function generateTransition(image1Path, image2Path, outputPath, duration = 5, transitionType = 'fade') {
    const halfDuration = duration / 2;

    // Create a transition video using xfade filter
    const cmd = `ffmpeg -y -loop 1 -t ${halfDuration} -i "${image1Path}" -loop 1 -t ${halfDuration} -i "${image2Path}" -filter_complex "[0:v][1:v]xfade=transition=${transitionType}:duration=0.5:offset=${halfDuration - 0.5},format=yuv420p[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;

    await runFFmpeg(cmd);
    return outputPath;
}

/**
 * Escape text for FFmpeg drawtext filter
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeForDrawtext(text) {
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

/**
 * Get subtitle Y position for FFmpeg
 * @param {string} position - Position (top, center, bottom)
 * @returns {string} FFmpeg Y expression
 */
function getSubtitleY(position) {
    switch (position) {
        case 'top': return 'h*0.1';
        case 'center': return '(h-text_h)/2';
        case 'bottom':
        default: return 'h*0.85';
    }
}

/**
 * Clean hex color for FFmpeg
 * @param {string} color - Color with or without #
 * @returns {string} Color without #
 */
function cleanColor(color) {
    return color.replace('#', '');
}

function resolveSubtitleFont(subtitleFont) {
    if (subtitleFont && typeof subtitleFont === 'string') {
        if (subtitleFont.includes('/') && fs.existsSync(subtitleFont)) {
            return { type: 'file', value: subtitleFont };
        }
        return { type: 'name', value: subtitleFont };
    }

    const candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
    ];

    const fontPath = candidates.find(candidate => fs.existsSync(candidate));
    if (fontPath) {
        return { type: 'file', value: fontPath };
    }

    return { type: 'name', value: 'Arial' };
}

/**
 * Compose video with audio and subtitles
 * @param {object} options - Composition options
 * @returns {Promise<object>} Result with video URL
 */
/**
 * Get file extension from URL
 * @param {string} url - File URL
 * @returns {string} Extension (e.g., '.mp3', '.m4a')
 */
function getExtensionFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const ext = path.extname(pathname);
        return ext || '.mp3'; // Default to .mp3 if no extension found
    } catch (e) {
        // If not a valid URL, might be a local path
        const ext = path.extname(url);
        return ext || '.mp3';
    }
}

async function composeVideo(options) {
    const {
        videoUrl,
        speechUrl,
        speechVolume = 1.0,
        musicUrl,
        musicVolume = 0.5,
        subtitleText,
        subtitlePosition = 'bottom',
        subtitleFont = 'Arial',
        subtitleColor = '#ffffff',
        subtitleSize = 24
    } = options;

    // PORT must be defined here since it's not available in module scope
    const PORT = process.env.PORT || 3002;

    const timestamp = Date.now();
    const videoPath = path.join(TEMP_DIR, `video_${timestamp}.mp4`);
    const speechExt = speechUrl ? getExtensionFromUrl(speechUrl) : '.mp3';
    const musicExt = musicUrl ? getExtensionFromUrl(musicUrl) : '.mp3';
    const speechPath = path.join(TEMP_DIR, `speech_${timestamp}${speechExt}`);
    const musicPath = path.join(TEMP_DIR, `music_${timestamp}${musicExt}`);
    const outputPath = path.join(OUTPUT_DIR, `composed_${timestamp}.mp4`);

    try {
        console.log('=== Starting composition ===');
        console.log('Input URLs:');
        console.log('  videoUrl:', videoUrl);
        console.log('  speechUrl:', speechUrl);
        console.log('  musicUrl:', musicUrl);
        console.log('Temp file paths:');
        console.log('  videoPath:', videoPath);
        console.log('  speechPath:', speechPath, '(ext:', speechExt + ')');
        console.log('  musicPath:', musicPath, '(ext:', musicExt + ')');
        console.log('Output:', outputPath);

        // Step 1: Download video
        console.log('Downloading video...');
        await downloadFile(videoUrl, videoPath);

        // Build FFmpeg command
        let inputs = [`-i "${videoPath}"`];
        let filterParts = [];
        let audioMixInputs = [];
        let inputIndex = 1;

        // Step 2: Download and add speech audio
        if (speechUrl) {
            console.log('Downloading speech from:', speechUrl);
            console.log('Speech path:', speechPath);
            await downloadFile(speechUrl, speechPath);

            // Verify file exists and has size
            if (!fs.existsSync(speechPath)) {
                throw new Error('Speech file was not downloaded');
            }
            const speechStats = fs.statSync(speechPath);
            console.log('Speech file size:', speechStats.size, 'bytes');

            // Verify audio stream exists using ffprobe
            try {
                const probeCmd = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${speechPath}"`;
                const { exec } = require('child_process');
                const probeResult = await new Promise((resolve, reject) => {
                    exec(probeCmd, (error, stdout, stderr) => {
                        if (error) {
                            console.warn('Speech file probe warning:', stderr);
                            resolve('unknown');
                        } else {
                            resolve(stdout.trim());
                        }
                    });
                });
                console.log('Speech audio stream:', probeResult);
            } catch (e) {
                console.warn('Could not probe speech file:', e.message);
            }

            inputs.push(`-i "${speechPath}"`);
            filterParts.push(`[${inputIndex}:a]volume=${speechVolume}[speech]`);
            audioMixInputs.push('[speech]');
            inputIndex++;
        }

        // Step 3: Download and add music audio
        if (musicUrl) {
            console.log('Downloading music from:', musicUrl);
            console.log('Music path:', musicPath);
            await downloadFile(musicUrl, musicPath);

            // Verify file exists and has size
            if (!fs.existsSync(musicPath)) {
                throw new Error('Music file was not downloaded');
            }
            const musicStats = fs.statSync(musicPath);
            console.log('Music file size:', musicStats.size, 'bytes');

            inputs.push(`-i "${musicPath}"`);
            filterParts.push(`[${inputIndex}:a]volume=${musicVolume}[music]`);
            audioMixInputs.push('[music]');
            inputIndex++;
        }

        // Step 4: Build filter complex
        let filterComplex = '';
        let videoFilters = [];

        if (subtitleText) {
            const escapedText = escapeForDrawtext(subtitleText);
            const yPos = getSubtitleY(subtitlePosition);
            const hexColor = cleanColor(subtitleColor);
            const fontSpec = resolveSubtitleFont(subtitleFont);
            const fontPart = fontSpec.type === 'file'
                ? `fontfile=${fontSpec.value.replace(/'/g, "'\\''")}`
                : `font=${fontSpec.value.replace(/'/g, "'\\''")}`;
            videoFilters.push(
                `drawtext=text='${escapedText}':${fontPart}:fontsize=${subtitleSize}:fontcolor=0x${hexColor}:x=(w-text_w)/2:y=${yPos}:box=1:boxcolor=black@0.5:boxborderw=5`
            );
        }

        if (videoFilters.length > 0) {
            filterParts.push(`[0:v]${videoFilters.join(',')}[vout]`);
        }

        if (audioMixInputs.length > 0) {
            filterParts.push(`${audioMixInputs.join('')}amix=inputs=${audioMixInputs.length}:duration=longest[aout]`);
        }

        // Build final command
        let ffmpegCmd = `ffmpeg -y ${inputs.join(' ')}`;

        if (filterParts.length > 0) {
            filterComplex = filterParts.join(';');
            ffmpegCmd += ` -filter_complex "${filterComplex}"`;
        }

        // Map outputs
        if (videoFilters.length > 0) {
            ffmpegCmd += ' -map "[vout]"';
        } else {
            ffmpegCmd += ' -map 0:v';
        }

        if (audioMixInputs.length > 0) {
            ffmpegCmd += ' -map "[aout]"';
        } else {
            ffmpegCmd += ' -an';
        }

        ffmpegCmd += ` -c:v libx264 -c:a aac -shortest "${outputPath}"`;

        // Step 5: Run FFmpeg
        console.log('Composing video...');
        console.log('Audio inputs:', audioMixInputs.length > 0 ? audioMixInputs.join(', ') : 'none');
        console.log('Full FFmpeg command:', ffmpegCmd);
        await runFFmpeg(ffmpegCmd);

        // Step 6: Clean up temp files
        [videoPath, speechPath, musicPath].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        let outputUrl = `http://localhost:${PORT}/output/composed_${timestamp}.mp4`;

        // Try uploading to R2
        try {
            const { uploadToR2, isR2Configured } = require('../utils/r2Storage');
            if (isR2Configured()) {
                console.log('R2 configured, uploading output...');
                const videoBuffer = fs.readFileSync(outputPath);
                const r2Url = await uploadToR2(videoBuffer, `composed_${timestamp}`, 'video/mp4');
                console.log('Uploaded to R2:', r2Url);
                outputUrl = r2Url;
            } else {
                console.log('R2 not configured, returning local URL');
            }
        } catch (uploadError) {
            console.error('R2 upload failed:', uploadError);
            console.log('Falling back to local URL');
        }

        console.log('Composition complete:', outputUrl);

        return {
            success: true,
            videoUrl: outputUrl,
            localPath: outputPath
        };

    } catch (error) {
        console.error('Composition failed:', error);

        // Clean up on error
        [videoPath, speechPath, musicPath, outputPath].forEach(f => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        throw error;
    }
}

module.exports = {
    downloadFile,
    runFFmpeg,
    getAudioDuration,
    cutVideo,
    generateTransition,
    escapeForDrawtext,
    getSubtitleY,
    cleanColor,
    composeVideo,
    concatVideoUrls,
    concatAudioUrls,
    OUTPUT_DIR,
    TEMP_DIR
};
