# Node Parameters Documentation

This document provides comprehensive documentation for all node types in the AI Video Workflow Builder, detailing every parameter users can configure, their purpose, and how they affect the output.

---

## Table of Contents

1. [Text Generation](#1-text-generation)
2. [Image Generation](#2-image-generation)
3. [Video Generation](#3-video-generation)
4. [Audio Generation](#4-audio-generation)
5. [Image Processing](#5-image-processing)
6. [Video Processing](#6-video-processing)
7. [Utilities](#7-utilities)
8. [Advanced Processing](#8-advanced-processing)

---

## 1. Text Generation

### 1.1 Text-to-Text (LLM Text Generation)

**Purpose**: Generate or transform text using large language models (OpenAI GPT models).

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Prompt** | Textarea | Main instruction or question for the AI | Primary determinant of the generated content. More specific prompts yield more focused responses. |
| **Model** | Select | AI model to use | **gpt-4o**: Most capable, best for complex tasks<br>**gpt-4o-mini**: Fast, cost-effective for simple tasks<br>**claude-3-opus**: Alternative for creative writing<br>**claude-3-sonnet**: Balanced speed and quality |
| **System Prompt** | Textarea | Context and behavior instructions | Sets the AI's persona, expertise level, and output format. Example: "You are a professional screenwriter. Write in screenplay format." |
| **Temperature** | Slider (0-1, step 0.1) | Creativity/randomness level | **0.0-0.3**: Deterministic, consistent, factual<br>**0.4-0.7**: Balanced creativity and coherence<br>**0.8-1.0**: Highly creative, unpredictable, experimental |
| **Concat Prompts** | Toggle | Enable multiple prompt fields | When enabled, allows chaining 4 prompts (prompt2-prompt4) for complex, multi-step generation |

**Output**:
- `text`: Generated text string
- Token usage and model metadata

**Use Cases**:
- Script generation: High temperature (0.7-0.9) for creativity
- Content summarization: Low temperature (0.1-0.3) for accuracy
- JSON data generation: System prompt with format instructions, temperature 0.1

---

## 2. Image Generation

### 2.1 Text-to-Image

**Purpose**: Generate images from text descriptions using AI image models.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Positive Prompt** | Textarea | Detailed description of desired image | Core determinant of visual content. Be specific about subjects, style, lighting, composition. Example: "A serene mountain lake at sunset, oil painting style, warm golden hour lighting" |
| **Negative Prompt** | Textarea | Elements to avoid in the image | Explicitly excludes unwanted features. Example: "blurry, low quality, distorted faces, watermark, text" |
| **Aspect Ratio** | Select | Image dimensions | **1:1**: Square (Instagram posts, logos)<br>**16:9**: Widescreen (YouTube thumbnails, presentations)<br>**9:16**: Vertical (TikTok, Instagram Stories)<br>**4:3**: Standard (classic photos) |
| **Model** | Select | AI image generation model | **fal-ai/flux/schnell**: Fastest, good for iterations<br>**fal-ai/z-image/turbo**: Balanced speed/quality<br>**dall-e-3**: Highest quality, best prompt adherence |

**Output**:
- `imageUrl`: URL to the generated image
- Image metadata (width, height, seed)

**Best Practices**:
- Use comma-separated descriptors in positive prompt
- Start with composition, then add style and lighting
- Negative prompt especially effective for fixing common AI artifacts
- DALL-E 3 automatically enhances prompts, other models need detailed input

---

### 2.2 Image-to-Image

**Purpose**: Transform or edit existing images using AI with text guidance.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Image** | Image URL | Input image to transform | Base visual content that will be modified according to the prompt |
| **Prompt** | Textarea | Transformation instructions | Describes desired changes. Example: "Convert to oil painting style" or "Add snow to the scene" |
| **Strength** | Slider (0-1, step 0.1) | How much to alter the original | **0.1-0.3**: Subtle changes, preserves original closely<br>**0.4-0.7**: Moderate transformation, balanced<br>**0.8-1.0**: Heavy modification, may deviate significantly |
| **Model** | Select | AI model for transformation | **fal-ai/stable-diffusion-v3-medium**: Better for artistic changes<br>**openai/dall-e-2**: Better for object additions/removals |

**Output**:
- `imageUrl`: URL to the transformed image
- Original image URL for comparison

**Use Cases**:
- Style transfer: Strength 0.6-0.8, detailed style prompt
- Object insertion: Strength 0.4-0.6, specific object description
- Color grading: Strength 0.2-0.4, color/mood description

---

## 3. Video Generation

### 3.1 Text-to-Video

**Purpose**: Generate video clips directly from text descriptions.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Prompt** | Textarea | Detailed scene description | Defines visual content, motion, and scene dynamics. Example: "A drone shot flying over a tropical beach with turquoise waves crashing on white sand" |
| **Duration** | Select | Video length | **5 seconds**: Quick transitions, b-roll<br>**10 seconds**: Full scene establishment<br>Actual duration capped at model limits (60s max) |
| **Resolution** | Select | Output video quality | **720p**: Fastest, smaller files<br>**1080p**: Standard HD quality<br>**4K**: Highest quality (longer generation time) |
| **Style** | Select | Visual aesthetic | **Realistic**: Photorealistic rendering<br>**Cinematic**: Film-like with depth of field<br>**Anime**: Animated/illustrated style<br>**3D Render**: CGI aesthetic |
| **Model** | Select | AI video generation model | **fal-ai/ltxv-13b-098-distilled**: Fast, good quality<br>**fal-ai/wan/v2.1/text-to-video**: Higher fidelity, slower |

**Output**:
- `videoUrl`: URL to generated video file
- Video metadata (dimensions, frame rate, timings)

**Best Practices**:
- Describe camera movement explicitly (pan, zoom, dolly)
- Include lighting conditions for consistency
- Avoid complex multi-subject scenes for better quality
- Style parameter significantly affects realism vs artistic look

---

### 3.2 Image-to-Video

**Purpose**: Animate static images with AI-generated motion.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Image** | Image URL | Base image to animate | Starting visual state; composition determines motion possibilities |
| **Motion Prompt** | Textarea | Description of desired animation | Guides movement and transformation. Example: "Camera slowly zooms in while leaves gently blow in the wind" |
| **Model** | Select | AI animation model | **fal-ai/ltxv-13b-098-distilled/image-to-video**: Standard animation<br>**fal-ai/wan/v2.1/image-to-video**: More natural motion |
| **Motion Bucket** | Number (1-255) | Intensity of motion | **1-50**: Minimal movement (subtle breathing, wind)<br>**51-150**: Moderate motion (walking, panning)<br>**151-255**: High motion (action scenes, rapid movement) |
| **Duration** | Number | Video length in seconds | Total animation time (typically 5-10s for best quality) |
| **Seed** | Number | Random generation seed | Same seed with same parameters = identical output (for reproducibility) |

**Output**:
- `videoUrl`: URL to the animated video
- Source image reference and duration

**Use Cases**:
- Ken Burns effect: Low motion bucket (20-40), camera movement prompt
- Character animation: Medium motion bucket (80-120), specific action prompt
- Environmental animation: High motion bucket (150-200), weather/nature prompt

---

## 4. Audio Generation

### 4.1 Text-to-Music

**Purpose**: Generate background music or soundtracks from text descriptions.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Prompt** | Textarea | Musical style and mood description | Defines genre, instruments, tempo, and emotional tone. Example: "Upbeat electronic dance music with synthesizers and driving drums, energetic and motivational" |
| **Duration** | Select | Music length in seconds | **auto**: Auto-calculates from video duration<br>**10-120**: Fixed duration in seconds<br>Longer durations may have repetition in some models |
| **Tempo (BPM)** | Number | Beats per minute | **60-80 BPM**: Slow, calm, ambient<br>**80-120 BPM**: Moderate, pop, standard<br>**120-160 BPM**: Fast, energetic, dance<br>**160+ BPM**: Very fast, intense |

**Output**:
- `audioUrl`: URL to generated music file (MP3)
- Actual duration and seed for reproducibility

**Best Practices**:
- Specify genre clearly (jazz, rock, classical, electronic)
- Include instrument details (piano, guitar, strings, synthesizer)
- Describe mood explicitly (uplifting, melancholic, tense, playful)
- Use "auto" duration when scoring videos for perfect synchronization

---

### 4.2 Text-to-Speech

**Purpose**: Convert text into natural-sounding speech audio.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Text Content** | Textarea | Script to be spoken | Exact words to synthesize; supports multiple paragraphs and punctuation for natural pacing |
| **Language** | Select | Target output language | **English**: Default, best quality<br>**Hindi**: Automatically translates input and generates Hindi speech<br>Text is auto-translated if language differs from input |
| **Voice** | Select | Voice character/persona | **alloy**: Neutral, balanced (male-leaning)<br>**echo**: Warm, friendly male<br>**fable**: Expressive British male<br>**onyx**: Deep, authoritative male<br>**nova**: Friendly, warm female<br>**shimmer**: Soft, gentle female |
| **Model** | Select | TTS synthesis engine | **fal-ai/playht/tts/v3**: High quality, natural intonation<br>**openai/tts-1**: Fast, good quality<br>**openai/gpt-4o-mini-tts**: Most natural, latest OpenAI |
| **Stability** | Slider (0-1, step 0.1) | Consistency vs expressiveness | **0.0-0.3**: Highly expressive, variable intonation<br>**0.4-0.7**: Balanced natural speech<br>**0.8-1.0**: Very consistent, monotone |

**Output**:
- `audioUrl`: URL to speech audio file (MP3)
- Translated text (if language conversion occurred)
- Original text and metadata

**Best Practices**:
- Use punctuation for natural pauses (commas, periods, question marks)
- Break long text into paragraphs for breathing room
- Stability 0.5 recommended for narration
- Stability 0.2-0.4 for dialogue/character voices
- OpenAI TTS works as automatic fallback if Fal AI fails

---

### 4.3 Video Sound Effects

**Purpose**: Generate custom sound effects synchronized to video content.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Prompt** | Textarea | Description of desired sound | Details the sound effect type, intensity, and characteristics. Example: "Heavy footsteps on wooden floor, echoing in large room" |
| **Duration (sec)** | Number | Sound effect length | Should match video segment duration for proper sync |
| **Sync to Video** | Video URL | Optional video for temporal alignment | When provided, analyzes video to time sound effects to visual events |

**Output**:
- `audioUrl`: URL to generated sound effect file
- Duration and sync metadata

---

## 5. Image Processing

### 5.1 Face Swap

**Purpose**: Replace faces in images using AI face-swapping technology.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Target Image** | Image URL | Photo containing the face to replace | Should have clear, front-facing face; lighting affects quality |
| **Source Face** | Image URL | Photo of the face to insert | Best with single clear face, neutral expression, similar angle to target |
| **Face Enhance** | Toggle | Apply face quality enhancement | **Enabled**: Improves skin texture, reduces artifacts<br>**Disabled**: Faster processing, raw output |

**Output**:
- `imageUrl`: Face-swapped result image
- Processing metadata

**Best Practices**:
- Use high-resolution source faces (at least 512x512)
- Match lighting conditions between source and target
- Front-facing angles work best
- Enable Face Enhance for professional results

---

### 5.2 Image Object Removal

**Purpose**: Remove unwanted objects or elements from images using AI inpainting.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Image** | Image URL | Image containing object to remove | AI will inpaint the removed area |
| **Mask/Description** | Text | Object to remove or mask coordinates | Text description (e.g., "person on left") or mask data for precise selection |

**Output**:
- `imageUrl`: Image with object removed
- Inpainting metadata

---

### 5.3 Image Remove Background

**Purpose**: Remove image backgrounds, isolating the main subject.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Image** | Image URL | Image to process | Should have clear subject separation from background |
| **Output Format** | Select | File format for result | **PNG**: Transparent background (recommended)<br>**JPG**: White or custom color background |

**Output**:
- `imageUrl`: Background-removed image
- Format and transparency info

---

## 6. Video Processing

### 6.1 Edit Video

**Purpose**: Apply editing operations to video files (audio mixing, trimming, filters, cropping).

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Video** | Video URL | Video file to edit | Base video for all edits |
| **Speech Volume** | Slider (0-2, step 0.1) | Voice/speech audio level | **0.0**: Mute speech<br>**1.0**: Original speech volume (default)<br>**2.0**: Double speech loudness |
| **Music Volume** | Slider (0-2, step 0.1) | Background music level | **0.0**: Mute music<br>**0.3**: Subtle background (default)<br>**0.5-0.8**: Balanced with speech<br>**1.0+**: Prominent music |
| **Trim Start** | Text | Start time for trimming | Format: "HH:MM:SS" or "MM:SS". Example: "00:05" starts at 5 seconds |
| **Trim End** | Text | End time for trimming | Format: "HH:MM:SS" or "MM:SS". Example: "01:30" ends at 1 minute 30 seconds |
| **Crop Ratio** | Select | Aspect ratio for cropping | **1:1**: Square crop (Instagram)<br>**16:9**: Widescreen crop<br>**9:16**: Vertical crop (TikTok/Stories)<br>Centers crop automatically |
| **Filter** | Select | Visual effect filter | **None**: No filter applied<br>**Grayscale**: Black and white<br>**Sepia**: Vintage warm tone<br>**High Contrast**: Enhanced blacks and whites |

**Output**:
- `videoUrl`: Edited video file
- Edit parameters applied

**Use Cases**:
- Social media formatting: Crop to 9:16, adjust volumes
- Podcast clips: Trim to segment, grayscale filter
- Background music: Music volume 0.3-0.5, speech volume 1.0-1.2

---

### 6.2 Clip Merger

**Purpose**: Combine multiple video clips into a single video with transitions and background music.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Input Clips** | Text | Video URLs to merge (comma-separated or array) | Clips are concatenated in the order provided |
| **Transition** | Select | Effect between clips | **Cross-fade**: Smooth blend (0.5s overlap)<br>**Slide**: Directional wipe<br>**Cut**: Instant transition<br>**Zoom**: Scale transition effect |
| **BGM Overlay** | Audio URL | Background music for entire merged video | Loops or fades to match total duration |

**Output**:
- `videoUrl`: Single merged video file
- Total duration and clip count

**Best Practices**:
- Match clip resolutions for best quality
- Use cross-fade for smooth narratives
- Use cut for fast-paced content
- BGM volume auto-adjusted if speech is detected

---

## 7. Utilities

### 7.1 Upload Files

**Purpose**: Import external assets (images, videos, audio) into the workflow.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source Type** | Select | Origin of files | **Local**: From user's device<br>**URL**: Direct link to file<br>**Cloud Storage**: Integration with cloud providers |
| **Asset Type** | Select | Media type | **Image**: JPG, PNG, WEBP<br>**Video**: MP4, MOV, WEBM<br>**Audio**: MP3, WAV, M4A |
| **Files** | File Upload | File selection interface | Accepts multiple files; processed into URLs for downstream nodes |

**Output**:
- `files`: Array of URLs to uploaded assets
- File metadata (size, format, dimensions)

---

### 7.2 Split Text

**Purpose**: Divide text into segments for parallel processing or sequential workflow steps.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source** | Textarea | Text or data to split | Can be plain text, JSON, or structured data |
| **Scenes** | Number | Number of segments to create | Text is divided into this many roughly equal parts |
| **Split Mode** | Select | Splitting strategy | **text**: Splits plain text by sentences/paragraphs<br>**array**: Splits JSON arrays into items<br>**json_path**: Extracts array from JSON path |
| **Array Path** | Text | JSON path to array (when mode is json_path) | Example: "response.body.Items" extracts Items array from nested JSON |

**Output**:
- `segments`: Array of text segments
- `items`: Structured array if using JSON modes
- `itemsCount`: Total number of segments

**Use Cases**:
- Parallel video generation: Split script into 5 scenes, each becomes a video
- Batch processing: Split JSON API response into individual records
- Sequential narration: Split long script into chapters

---

## 8. Advanced Processing

### 8.1 Lip Sync

**Purpose**: Synchronize character lip movements in video with audio dialogue.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Video File** | Video URL | Video containing face/character | Should have visible mouth/face for tracking |
| **Audio File** | Audio URL | Speech audio to sync | Dialogue or narration to match to video |
| **Model** | Select | Lip sync algorithm | **SadTalker**: Realistic, works with photos<br>**HeyGen**: High quality commercial grade<br>**SyncLabs**: Fast processing |

**Output**:
- `videoUrl`: Lip-synced video file
- Sync accuracy metrics

---

### 8.2 AI Avatar

**Purpose**: Generate talking avatar videos from text scripts.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Avatar** | Select | Character model to use | **Predefined 1-2**: Built-in characters<br>**Custom**: User-uploaded character image |
| **Script** | Textarea | Dialogue for avatar to speak | Text is converted to speech and lip-synced to avatar |
| **Background** | Select | Scene background type | **Transparent**: Green screen output<br>**Solid Color**: Single color backdrop<br>**Image**: Custom background image |

**Output**:
- `videoUrl`: Avatar video with speech
- Character and background metadata

---

### 8.3 Enhancer

**Purpose**: Upscale and improve quality of images or videos using AI.

| Parameter | Type | Purpose | Effect on Output |
|-----------|------|---------|------------------|
| **Source File** | File URL | Media to enhance | Works with both images and videos |
| **Upscale Factor** | Select | Resolution multiplier | **1x**: No upscaling, denoise only<br>**2x**: Double resolution (1080p → 4K)<br>**4x**: Quadruple resolution (540p → 1080p) |
| **Denoise Strength** | Slider (0-1, step 0.1) | Noise reduction level | **0.0**: No denoising<br>**0.3-0.5**: Moderate cleanup (recommended)<br>**0.7-1.0**: Aggressive smoothing (may lose detail) |

**Output**:
- `videoUrl` or `imageUrl`: Enhanced media file
- Resolution and quality metrics

**Best Practices**:
- Use 2x for most upscaling needs
- 4x can introduce artifacts on low-quality sources
- Denoise strength 0.4 balances detail and cleanup
- Processing time increases significantly with upscale factor

---

## General Node Concepts

### Execution Modes

All nodes support the following execution configurations (in Node Properties Panel):

- **Run items in parallel**: When node receives array input, process all items simultaneously vs sequentially
- **Wait for all previous items**: Node waits for all upstream parallel executions before starting
- **Aggregate items into one request**: Combines array inputs into single API call (when supported by node)

### Mock Data (Debug Mode)

Every node can use mock data for testing:
- **Use mock input data**: Toggle to enable test mode
- **Mock JSON Input**: Provide test data as JSON object or array
- Allows testing node configurations without running full workflow

### Node Linking

Nodes can reference outputs from previous nodes:
- Click "Link" button on compatible parameters (text, image, video, audio fields)
- Select source node and output key
- Dynamic value substitution during execution
- Enables data flow between workflow steps

---

## Parameter Best Practices Summary

### For Quality
- Higher-tier models produce better results but cost more and take longer
- Resolution settings directly impact quality and processing time
- Detailed prompts yield more accurate results across all generation nodes

### For Speed
- Use "mini" or "turbo" model variants when available
- Lower resolutions and shorter durations reduce generation time
- Parallel execution mode speeds up batch processing

### For Cost Efficiency
- gpt-4o-mini for text, gpt-image-1-mini for images
- Shorter durations for video/audio when acceptable
- Reuse generated assets via Upload Files node instead of regenerating

### For Reproducibility
- Set explicit seed values in nodes that support it
- Use temperature 0.0-0.2 for deterministic text generation
- Save successful parameter combinations as templates

---

## Common Workflows

### Full Video Production Pipeline
1. **Text-to-Text** (Script generation): High temperature, detailed system prompt
2. **Split Text** (Scene breakdown): Split by scenes/segments
3. **Text-to-Image** (Scene images): Parallel mode, aspect ratio 16:9
4. **Image-to-Video** (Animate scenes): Motion bucket 80-120, parallel
5. **Text-to-Speech** (Narration): From split text segments
6. **Text-to-Music** (Soundtrack): Duration "auto" to match video
7. **Edit Video** (Mix audio): Speech volume 1.0, music volume 0.3
8. **Clip Merger** (Combine scenes): Cross-fade transitions, add BGM

### Social Media Content Creation
1. **Text-to-Image** (Visual generation): Aspect 9:16 or 1:1
2. **Image-to-Video** (Animate): 5 seconds, high motion bucket
3. **Text-to-Speech** (Voiceover): Expressive voice, stability 0.3
4. **Edit Video** (Format): Crop to platform ratio, apply filters

### Podcast/Audio Content
1. **Text-to-Text** (Content generation): Temperature 0.6, conversational system prompt
2. **Text-to-Speech** (Multiple voices): Different voices for variety
3. **Text-to-Music** (Intro/Outro): Short duration (10-15s)
4. **Edit Video** (Mix): Balance speech and music volumes

---

**Document Version**: 1.0
**Last Updated**: 2026-01-05
**Total Nodes Documented**: 18
