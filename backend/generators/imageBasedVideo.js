/**
 * Image-Based Video Generator Module
 * Creates videos from static images with controlled camera effects (zoom, pan, etc.)
 * Uses FFmpeg zoompan filter for Ken Burns-style effects
 */

const path = require('path');
const fs = require('fs');

const { downloadFile, runFFmpeg, OUTPUT_DIR, TEMP_DIR } = require('./ffmpeg');

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Effect Presets Library
 * Defines zoom/pan behaviors with FFmpeg zoompan filter parameters
 * Note: Resolution (s=) is set dynamically, not in presets
 */
const EFFECT_PRESETS = {
    zoom_in: {
        description: 'Smooth zoom from center',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.5;  // 1.5 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = actualZoomRange / (fps * duration);
            const maxZoom = 1.0 + actualZoomRange;
            return `zoompan=z='min(zoom+${zoomSpeed},${maxZoom})':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
        }
    },
    zoom_out: {
        description: 'Smooth zoom out from center',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.5;  // 1.5 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = actualZoomRange / (fps * duration);
            const startScale = 1.0 + actualZoomRange;
            return `zoompan=z='if(eq(on,1),${startScale},max(1.001,zoom-${zoomSpeed}))':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
        }
    },
    zoom_in_out: {
        description: 'Zoom in then out',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.4;  // 1.4 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = (actualZoomRange / 2) / (fps * duration);
            const maxZoom = 1.0 + actualZoomRange;
            return `zoompan=z='min(max(1.001,zoom+sin(on/${fps * duration}*PI)*${zoomSpeed}),${maxZoom})':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
        }
    },
    pan_down: {
        description: 'Top-down movement (pan from top to bottom)',
        getFilter: (duration, fps, intensity) => {
            const scale = 1.2;
            return `zoompan=z='${scale}':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih-on*ih/${fps * duration}'`;
        }
    },
    pan_up: {
        description: 'Bottom-top movement (pan from bottom to top)',
        getFilter: (duration, fps, intensity) => {
            const scale = 1.2;
            return `zoompan=z='${scale}':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='on*ih/${fps * duration}'`;
        }
    },
    pan_left: {
        description: 'Pan from right to left',
        getFilter: (duration, fps, intensity) => {
            const scale = 1.2;
            return `zoompan=z='${scale}':d=${fps * duration}:x='iw-on*iw/${fps * duration}':y='ih/2-(ih/zoom/2)'`;
        }
    },
    pan_right: {
        description: 'Pan from left to right',
        getFilter: (duration, fps, intensity) => {
            const scale = 1.2;
            return `zoompan=z='${scale}':d=${fps * duration}:x='on*iw/${fps * duration}':y='ih/2-(ih/zoom/2)'`;
        }
    },
    ken_burns: {
        description: 'Classic documentary style (slow zoom with subtle pan)',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.15;  // 1.15 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = actualZoomRange / (fps * duration);
            const maxZoom = 1.0 + actualZoomRange;
            return `zoompan=z='min(zoom+${zoomSpeed},${maxZoom})':d=${fps * duration}:x='iw/2-(iw/zoom/1.5)':y='ih/2-(ih/zoom/1.5)'`;
        }
    },
    ultra_zoom: {
        description: 'Extreme zoom with motion blur effect',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 2.0;  // 3.0 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = actualZoomRange / (fps * duration);
            const maxZoom = 1.0 + actualZoomRange;
            return `zoompan=z='min(zoom+${zoomSpeed},${maxZoom})':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
        }
    },
    pulse: {
        description: 'Repeated zoom in and out',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.2;  // ±0.1 from 1.2
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = (actualZoomRange / 2) / (fps * duration);
            return `zoompan=z='1.2+sin(on/${fps * 0.5}*PI)*${zoomSpeed}':d=${fps * duration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
        }
    },
    rotate: {
        description: 'Slow rotation with zoom',
        getFilter: (duration, fps, intensity) => {
            const baseZoomRange = 0.3;  // 1.3 - 1.0
            const actualZoomRange = baseZoomRange * (intensity / 5);
            const zoomSpeed = actualZoomRange / (fps * duration);
            const maxZoom = 1.0 + actualZoomRange;
            const rotationSpeed = 0.1 * intensity;
            const totalFrames = fps * duration;
            return `zoompan=z='min(zoom+${zoomSpeed},${maxZoom})':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',rotate='angle*on*${rotationSpeed}/${totalFrames}'`;
        }
    }
};

/**
 * Resolution presets for output video
 */
const RESOLUTIONS = {
    '1920x1080': { width: 1920, height: 1080 },
    '1280x720': { width: 1280, height: 720 },
    '854x480': { width: 854, height: 480 },
    '1080x1920': { width: 1080, height: 1920 },
    '1080x1080': { width: 1080, height: 1080 }
};

/**
 * Transition types supported by FFmpeg xfade filter
 */
const TRANSITION_TYPES = {
    fade: 'fade',
    cut: 'cut',
    dissolve: 'dissolve',
    wipe_left: 'wipeleft',
    wipe_right: 'wiperight'
};

/**
 * Parse resolution string to width and height
 * @param {string} resolution - Resolution string (e.g., '1920x1080')
 * @returns {{width: number, height: number}}
 */
function parseResolution(resolution) {
    if (RESOLUTIONS[resolution]) {
        return RESOLUTIONS[resolution];
    }
    // Default to 1080p
    return { width: 1920, height: 1080 };
}

/**
 * Detect image format from magic bytes (file signature)
 * @param {string} filePath - Path to the image file
 * @returns {string} File extension including dot (e.g., '.png', '.jpg', '.webp')
 */
function detectImageFormat(filePath) {
    const buffer = fs.readFileSync(filePath);
    const firstBytes = buffer.subarray(0, 12);

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47) {
        return '.png';
    }
    // JPEG signature: FF D8 FF
    if (firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF) {
        return '.jpg';
    }
    // WebP signature: RIFF....WEBP
    if (firstBytes[0] === 0x52 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x46 &&
        firstBytes[8] === 0x57 && firstBytes[9] === 0x45 && firstBytes[10] === 0x42 && firstBytes[11] === 0x50) {
        return '.webp';
    }
    // GIF signature: GIF8
    if (firstBytes[0] === 0x47 && firstBytes[1] === 0x49 && firstBytes[2] === 0x46 && firstBytes[3] === 0x38) {
        return '.gif';
    }
    // BMP signature: BM
    if (firstBytes[0] === 0x42 && firstBytes[1] === 0x4D) {
        return '.bmp';
    }

    // Unknown format, default to .jpg
    return '.jpg';
}

/**
 * Verify image is valid using FFprobe
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<boolean>} True if image is valid
 */
async function verifyImage(imagePath) {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${imagePath}"`,
            (error, stdout, stderr) => {
                if (error || !stdout.trim()) {
                    console.error(`[ImageBasedVideo] Image verification failed for ${imagePath}:`, stderr || error.message);
                    resolve(false);
                } else {
                    const codec = stdout.trim();
                    console.log(`[ImageBasedVideo] Image verified: ${imagePath} (codec: ${codec})`);
                    resolve(true);
                }
            }
        );
    });
}

/**
 * Download all images from URLs to temp directory
 * @param {string[]} imageUrls - Array of image URLs
 * @param {string} timestamp - Unique timestamp for filenames
 * @returns {Promise<string[]>} Array of local file paths
 */
async function downloadImages(imageUrls, timestamp) {
    const localPaths = [];

    for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];

        // First download to a temp file without extension
        const tempPath = path.join(TEMP_DIR, `img_${timestamp}_${i}_temp`);
        console.log(`[ImageBasedVideo] Downloading image ${i + 1}/${imageUrls.length}: ${imageUrl.substring(0, 60)}...`);

        try {
            await downloadFile(imageUrl, tempPath);

            // Small delay to ensure file is fully flushed to disk (fixes race condition)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify file was downloaded - retry up to 5 times if file not visible yet
            let retries = 0;
            const maxRetries = 5;
            while (!fs.existsSync(tempPath) && retries < maxRetries) {
                console.log(`[ImageBasedVideo] File not visible yet, retry ${retries + 1}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            // Final check
            if (!fs.existsSync(tempPath)) {
                throw new Error(`Failed to download image: ${imageUrl} (file not found after ${maxRetries} retries)`);
            }

            const stats = fs.statSync(tempPath);
            console.log(`[ImageBasedVideo] Downloaded ${stats.size} bytes`);

            if (stats.size === 0) {
                throw new Error(`Downloaded file is empty: ${imageUrl}`);
            }

            // Detect actual format from magic bytes
            const detectedExt = detectImageFormat(tempPath);
            console.log(`[ImageBasedVideo] Detected format: ${detectedExt}`);

            // Rename to correct extension
            const finalPath = path.join(TEMP_DIR, `img_${timestamp}_${i}${detectedExt}`);
            fs.renameSync(tempPath, finalPath);

            // Verify image is valid using FFprobe
            const isValid = await verifyImage(finalPath);
            if (!isValid) {
                fs.unlinkSync(finalPath);
                throw new Error(`Downloaded file is not a valid image: ${imageUrl}`);
            }

            localPaths.push(finalPath);

        } catch (error) {
            // Clean up temp file if it exists
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }
    }

    return localPaths;
}

/**
 * Generate a video clip from a single image with zoompan effect
 * @param {string} imagePath - Local path to image
 * @param {string} outputPath - Output video path
 * @param {object} options - Effect options
 * @returns {Promise<void>}
 */
async function generateVideoClip(imagePath, outputPath, options) {
    const {
        duration,
        fps,
        effectType,
        effectIntensity,
        resolution,
        enableMotionBlur
    } = options;

    const { width, height } = parseResolution(resolution);

    // Get effect preset
    const preset = EFFECT_PRESETS[effectType] || EFFECT_PRESETS.ken_burns;
    const zoompanFilter = preset.getFilter(duration, fps, effectIntensity);

    console.log(`[ImageBasedVideo] Applying effect: ${effectType} (${preset.description})`);

    // Build FFmpeg command
    let ffmpegCmd = `ffmpeg -y -loop 1 -i "${imagePath}"`;

    // Build filter complex: zoompan + resolution (+ optional motion blur)
    let filterComplex = zoompanFilter + `:s=${width}x${height}`;

    // Add motion blur if enabled (separate filter chain)
    if (enableMotionBlur) {
        filterComplex += `,mblur=frame=8:strength=32`;
    }

    ffmpegCmd += ` -vf "${filterComplex}" -c:v libx264 -t ${duration} -r ${fps} -pix_fmt yuv420p "${outputPath}"`;

    console.log(`[ImageBasedVideo] Generating clip: ${outputPath}`);
    await runFFmpeg(ffmpegCmd);

    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
        throw new Error(`FFmpeg failed to create video clip: ${outputPath}`);
    }

    const stats = fs.statSync(outputPath);
    console.log(`[ImageBasedVideo] Generated clip: ${stats.size} bytes`);
}

/**
 * Concatenate multiple video clips with transitions
 * @param {string[]} clipPaths - Array of video clip paths
 * @param {string} outputPath - Final output path
 * @param {object} options - Concatenation options
 * @returns {Promise<void>}
 */
async function concatenateClips(clipPaths, outputPath, options) {
    const {
        transitionType,
        transitionDuration,
        fps,
        clipDuration // Add clip duration to options
    } = options;

    // Single clip - just copy it
    if (clipPaths.length === 1) {
        console.log(`[ImageBasedVideo] Single clip, copying to output`);
        fs.copyFileSync(clipPaths[0], outputPath);
        return;
    }

    // Hard cut transition - use simple concat
    if (transitionType === 'cut') {
        const listPath = path.join(TEMP_DIR, `concat_${Date.now()}.txt`);
        const listContent = clipPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');

        try {
            fs.writeFileSync(listPath, listContent);
            const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
            await runFFmpeg(ffmpegCmd);
        } finally {
            // Always clean up list file
            if (fs.existsSync(listPath)) {
                fs.unlinkSync(listPath);
            }
        }
        return;
    }

    // Use xfade for smooth transitions
    console.log(`[ImageBasedVideo] Concatenating ${clipPaths.length} clips with ${transitionType} transition`);

    // Build xfade filter chain
    let filterComplex = '';
    const inputs = [];

    for (let i = 0; i < clipPaths.length; i++) {
        inputs.push(`-i "${clipPaths[i]}"`);
    }

    // Chain xfade filters with proper offset calculation
    // xfade offset is the timestamp (in seconds) in the FIRST input where transition begins
    // For transition between clip i and i+1: offset = clipDuration * (i + 1) - transitionDuration
    for (let i = 0; i < clipPaths.length - 1; i++) {
        // Transition starts at the end of clip i, which is at time: clipDuration * (i + 1)
        // Subtract transitionDuration so transition ends when clip i+1 begins
        const offset = (clipDuration * (i + 1)) - transitionDuration;

        // Ensure offset is valid (must be >= transitionDuration for xfade to work)
        const validOffset = Math.max(offset, transitionDuration);

        if (i === 0) {
            filterComplex += `[0:v][1:v]xfade=transition=${TRANSITION_TYPES[transitionType]}:duration=${transitionDuration}:offset=${validOffset}[v1]`;
        } else {
            filterComplex += `;[v${i}][${i + 1}:v]xfade=transition=${TRANSITION_TYPES[transitionType]}:duration=${transitionDuration}:offset=${validOffset}[v${i + 1}]`;
        }
    }

    const ffmpegCmd = `ffmpeg -y ${inputs.join(' ')} -filter_complex "${filterComplex}" -map "[v${clipPaths.length - 1}]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    await runFFmpeg(ffmpegCmd);
}

/**
 * Main function to generate image-based video
 * @param {object} config - Configuration object
 * @returns {Promise<object>} Result object with video URL and metadata
 */
async function generateImageBasedVideo(config) {
    const {
        imageUrls,
        durationPerImage = 5,
        effectType = 'ken_burns',
        effectIntensity = 5,
        transitionType = 'fade',
        transitionDuration = 1,
        outputFPS = 24,
        resolution = '1920x1080',
        enableMotionBlur = false
    } = config;

    // Validate inputs
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error('imageUrls must be a non-empty array');
    }

    if (!EFFECT_PRESETS[effectType]) {
        throw new Error(`Unknown effect type: ${effectType}. Valid types: ${Object.keys(EFFECT_PRESETS).join(', ')}`);
    }

    if (effectIntensity < 1 || effectIntensity > 10) {
        throw new Error('effectIntensity must be between 1 and 10');
    }

    console.log('=== Image-Based Video Generation ===');
    console.log(`Images: ${imageUrls.length}`);
    console.log(`Duration per image: ${durationPerImage}s`);
    console.log(`Effect: ${effectType}`);
    console.log(`Intensity: ${effectIntensity}`);
    console.log(`Transition: ${transitionType}`);
    console.log(`Resolution: ${resolution}`);
    console.log(`FPS: ${outputFPS}`);
    console.log(`Motion blur: ${enableMotionBlur}`);

    const timestamp = Date.now();
    const clipPaths = [];
    let imagePaths = [];

    try {
        // Step 1: Download all images
        console.log('\n[Step 1] Downloading images...');
        imagePaths = await downloadImages(imageUrls, timestamp);

        // Step 2: Generate video clips for each image
        console.log('\n[Step 2] Generating video clips...');
        for (let i = 0; i < imagePaths.length; i++) {
            const clipPath = path.join(TEMP_DIR, `clip_${timestamp}_${i}.mp4`);
            await generateVideoClip(imagePaths[i], clipPath, {
                duration: durationPerImage,
                fps: outputFPS,
                effectType,
                effectIntensity,
                resolution,
                enableMotionBlur
            });
            clipPaths.push(clipPath);
        }

        // Step 3: Concatenate clips with transitions
        console.log('\n[Step 3] Concatenating clips...');
        const finalOutputPath = path.join(OUTPUT_DIR, `image_video_${timestamp}.mp4`);
        await concatenateClips(clipPaths, finalOutputPath, {
            transitionType,
            transitionDuration,
            fps: outputFPS,
            clipDuration: durationPerImage
        });

        // Verify final output
        if (!fs.existsSync(finalOutputPath)) {
            throw new Error('Failed to create final video');
        }

        const finalStats = fs.statSync(finalOutputPath);
        const totalDuration = imageUrls.length * durationPerImage;

        console.log('\n[Step 4] Cleanup and finalization...');
        console.log(`Final video: ${finalStats.size} bytes`);

        // Clean up temp files (with error handling)
        [...imagePaths, ...clipPaths].forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    console.warn(`[ImageBasedVideo] Failed to cleanup temp file: ${filePath}`, cleanupError.message);
                }
            }
        });

        // Generate URL
        const PORT = process.env.PORT || 3002;
        let outputUrl = `http://localhost:${PORT}/output/image_video_${timestamp}.mp4`;

        // Try uploading to R2
        try {
            const { uploadToR2, isR2Configured } = require('../utils/r2Storage');

            if (isR2Configured()) {
                console.log('[ImageBasedVideo] Uploading to R2...');
                const videoBuffer = fs.readFileSync(finalOutputPath);
                const r2Url = await uploadToR2(videoBuffer, `image_video_${timestamp}`, 'video/mp4');
                outputUrl = r2Url;
                console.log('[ImageBasedVideo] Uploaded to R2:', r2Url);
            }
        } catch (uploadError) {
            console.warn('[ImageBasedVideo] R2 upload failed, using local URL:', uploadError.message);
        }

        console.log('\n=== Image-Based Video Generation Complete ===');

        return {
            videoUrl: outputUrl,
            originalVideoUrl: outputUrl,
            sourceImages: imageUrls,
            duration: totalDuration,
            effectApplied: effectType,
            resolution,
            frameCount: Math.round(totalDuration * outputFPS),
            clipsGenerated: imageUrls.length
        };

    } catch (error) {
        console.error('[ImageBasedVideo] Generation failed:', error.message);

        // Clean up on error - clean both imagePaths and clipPaths
        const allTempFiles = [...(imagePaths || []), ...clipPaths];
        allTempFiles.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (cleanupError) {
                    console.warn(`[ImageBasedVideo] Failed to cleanup temp file: ${filePath}`, cleanupError.message);
                }
            }
        });

        throw error;
    }
}

module.exports = {
    generateImageBasedVideo,
    EFFECT_PRESETS,
    TRANSITION_TYPES
};
