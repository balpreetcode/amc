# Image-to-Video Node (Node 8) - Complete Issue Analysis

**Date**: 2026-01-05
**Error**: `Request failed with status code 422` (Unprocessable Entity)
**Analysis**: Ultra-deep investigation of all failure causes

---

## 🔴 CRITICAL ISSUES FOUND

### Issue #1: Array Input Instead of Single Image URL ⚠️ **PRIMARY CAUSE**

**Location**: `backend/server.js:160` and `backend/server.js:878-886`

**Root Cause**:
When `text_to_image` node runs in **parallel mode**, it produces an array of image URLs:
```javascript
output: {
  items: ['url1.png', 'url2.png', 'url3.png', ...]
}
```

The `image_to_video` node uses `getLastOutput(previousResults, 'imageUrl')` which returns the ENTIRE ARRAY instead of a single image URL.

**What Gets Sent to Fal AI**:
```javascript
{
  image_url: ['url1', 'url2', 'url3'],  // ❌ WRONG - expects string
  prompt: "...",
  num_frames: 120,
  frame_rate: 24
}
```

**Fal AI Validation**:
- Expects: `image_url` (string) - single image URL
- Receives: `image_url` (array) - multiple URLs
- Result: **422 Validation Error**

**Evidence from Workflow History**:
```
text_to_image (parallel): 12 images generated
  ['https://v3b.fal.media/...png', 'https://v3b.fal.media/...png', ...]

image_to_video node receives: entire array
  → Sends array to Fal AI
  → 422 Error: "Request failed with status code 422"
```

**Fix Options**:
1. **User Action**: Turn OFF "Run items in parallel" for image_to_video node
2. **Code Fix**: Add array handling in `image_to_video` processor to split arrays into individual requests
3. **Validation**: Add type checking before sending to Fal AI

---

### Issue #2: Invalid `num_frames` Values 🐛

**Location**: `backend/generators/video.js:124-127`

**Fal AI Constraint**: `num_frames` must be in range **[9, 1441]**

**Current Code**:
```javascript
const cappedDuration = Math.min(duration, 60);
const numFrames = Math.round(cappedDuration * 24);
```

**Problem**: No validation for minimum value. If `duration` is:
- `0` → `num_frames = 0` ❌ **422 ERROR** (below minimum of 9)
- `-1` → `num_frames = -24` ❌ **422 ERROR** (below minimum)
- `0.1` → `num_frames = 2` ❌ **422 ERROR** (below minimum of 9)
- `0.3` → `num_frames = 7` ❌ **422 ERROR** (below minimum of 9)

**Valid Minimum**: `9 frames / 24 fps = 0.375 seconds` minimum duration

**User Can Enter Invalid Values**:
The frontend uses `type: 'number'` with no `min` constraint:
```javascript
// NodePropertiesPanel.tsx line 58
{ name: 'duration', label: 'Duration', type: 'number' }
```

Users can enter 0, negative values, or very small decimals.

**Fix Needed**:
```javascript
// Backend validation
const duration = Math.max(config.duration || 5, 0.375); // Minimum 0.375s
const cappedDuration = Math.min(duration, 60);
const numFrames = Math.round(cappedDuration * 24);

// Or enforce minimum frames
const numFrames = Math.max(9, Math.round(cappedDuration * 24));
```

**Frontend Fix**:
```javascript
{ name: 'duration', label: 'Duration', type: 'number', min: 0.375, max: 60 }
```

---

### Issue #3: Missing Optional Parameters (Minor Impact)

**Fal AI Supports These Parameters** (we're not sending them):
```javascript
{
  resolution: "720p" | "480p",        // We don't send (uses default 720p)
  aspect_ratio: "16:9" | "9:16" | "1:1" | "auto",  // We don't send (uses auto)
  negative_prompt: string,             // We don't send
  enable_detail_pass: boolean,         // We don't send
  seed: integer,                       // We don't send (no reproducibility)
  // ... and more
}
```

**Impact**: Limited user control, no reproducibility with seed

**Current Payload**:
```javascript
{
  image_url: imageUrl,
  prompt: prompt,
  num_frames: numFrames,
  frame_rate: frameRate
}
```

**Fix**: Add optional parameters to NodePropertiesPanel and pass through to API

---

### Issue #4: `getLastOutput` Returns Raw Value (No Type Checking)

**Location**: `backend/server.js:878-886`

**Function**:
```javascript
function getLastOutput(previousResults, key) {
    for (let i = previousResults.length - 1; i >= 0; i--) {
        const output = previousResults[i]?.data?.output;
        if (output && output[key]) {
            return output[key];  // ⚠️ Returns WHATEVER type this is
        }
    }
    return null;
}
```

**Problem**: Returns the value as-is without checking if it's an array

**When Previous Node Runs in Parallel**:
- `output.imageUrl` could be `['url1', 'url2', 'url3']`
- `getLastOutput()` returns the entire array
- No warning or validation

**Fix**:
```javascript
function getLastOutput(previousResults, key, expectArray = false) {
    for (let i = previousResults.length - 1; i >= 0; i--) {
        const output = previousResults[i]?.data?.output;
        if (output && output[key]) {
            const value = output[key];

            // If we expect single value but got array, return first item
            if (!expectArray && Array.isArray(value)) {
                console.warn(`[getLastOutput] Expected single value for '${key}', got array. Using first item.`);
                return value[0];
            }

            return value;
        }
    }
    return null;
}
```

---

### Issue #5: Model Path Variations Not Validated

**Frontend Options**:
```javascript
options: [
    'fal-ai/ltxv-13b-098-distilled/image-to-video',
    'fal-ai/wan/v2.1/image-to-video'
]
```

**Potential Issues**:
- If user manually edits model path and removes `/image-to-video` suffix
- Different model versions have different parameter requirements
- No validation that model supports image-to-video

**Fix**: Add model validation before API call

---

### Issue #6: Error Message Doesn't Include API Response Details

**Current Error Handling**: `video.js:34-49`

```javascript
catch (error) {
    console.error('[Fal AI Video] Queue submission error:', {
        status: error.response?.status,
        data: JSON.stringify(error.response?.data, null, 2),
        requestBody: body
    });

    // Only checks for balance errors
    // Doesn't pass validation errors to user
    throw error;  // Generic "Request failed with status code 422"
}
```

**Problem**: 422 errors often include detailed validation messages:
```json
{
  "detail": [
    {
      "loc": ["body", "num_frames"],
      "msg": "ensure this value is greater than or equal to 9",
      "type": "value_error.number.not_ge"
    }
  ]
}
```

But we only show: `"Request failed with status code 422"`

**Fix**: Extract and include validation details in error message

---

## 📊 ERROR FREQUENCY ANALYSIS

From workflow history analysis:
- Total `image_to_video` failures: **5**
- 422 errors: **4** (80%)
- 503 errors: **1** (20% - Fal AI service unavailable)

**All 422 errors** were from workflows where:
1. `text_to_image` ran in **parallel mode**
2. Generated **8-12 images** as array
3. `image_to_video` received array instead of single URL

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix Array Handling (Fixes 80% of errors)

**Option A - Quick User Fix**:
- Document: "Turn OFF parallel mode for image_to_video when previous node outputs array"
- Update NodeFeeding.md with this guidance

**Option B - Code Fix**:
```javascript
// backend/server.js:159-175
image_to_video: async (config, previousResults) => {
    let imageUrl = config.imageUrl || getLastOutput(previousResults, 'imageUrl');
    const prompt = config.prompt || 'gentle animation with subtle movement';
    const duration = config.duration || 5;

    if (!imageUrl) throw new Error('No input image provided');

    // FIX: Handle array inputs
    if (Array.isArray(imageUrl)) {
        if (imageUrl.length === 0) throw new Error('Empty image array');
        console.warn(`[image_to_video] Received array of ${imageUrl.length} images, using first one`);
        imageUrl = imageUrl[0];  // Take first image
    }

    const response = await generateVideo(imageUrl, prompt, duration, config.model, true);
    // ...
}
```

### Priority 2: Validate Duration/num_frames

```javascript
// backend/generators/video.js:109
async function generateVideo(imageUrl, prompt = '', duration = 5, model = '...', includeMetadata = false) {
    // ... array checks ...

    // FIX: Validate duration
    let validDuration = Number(duration) || 5;
    if (validDuration < 0.375) {
        console.warn(`[Fal AI Video] Duration ${validDuration}s too short, using minimum 0.375s`);
        validDuration = 0.375;
    }
    const cappedDuration = Math.min(validDuration, 60);
    const numFrames = Math.max(9, Math.round(cappedDuration * 24)); // Ensure minimum 9 frames

    // ...
}
```

### Priority 3: Improve Error Messages

```javascript
// video.js:34-49
catch (error) {
    const errorDetail = error.response?.data?.detail;
    let errorMessage = `Fal AI video generation failed: ${error.message}`;

    if (Array.isArray(errorDetail)) {
        const details = errorDetail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
        errorMessage += ` - ${details}`;
    } else if (typeof errorDetail === 'string') {
        errorMessage += ` - ${errorDetail}`;
    }

    // Log full details
    console.error('[Fal AI Video] Error:', {
        status: error.response?.status,
        detail: errorDetail,
        requestBody: body
    });

    throw new Error(errorMessage);
}
```

### Priority 4: Add Frontend Validation

```javascript
// NodePropertiesPanel.tsx
{
  name: 'duration',
  label: 'Duration (seconds)',
  type: 'number',
  min: 0.375,      // Minimum 9 frames / 24 fps
  max: 60,         // Fal AI maximum
  step: 0.1
}
```

---

## 📋 VALIDATION CHECKLIST

Before sending request to Fal AI, validate:

- [ ] `image_url` is a string (not array)
- [ ] `image_url` is a valid URL
- [ ] `image_url` format is jpg, jpeg, png, webp, gif, or avif
- [ ] `num_frames` is in range [9, 1441]
- [ ] `frame_rate` is in range [1, 60]
- [ ] `resolution` is "480p" or "720p" (if provided)
- [ ] `aspect_ratio` is "9:16", "1:1", "16:9", or "auto" (if provided)

---

## 🧪 TEST CASES TO ADD

```javascript
describe('image_to_video parameter validation', () => {
    it('should handle array input by taking first element', () => {
        const imageUrl = ['url1', 'url2', 'url3'];
        // Should use 'url1'
    });

    it('should reject duration=0', () => {
        // Should default to 0.375 or throw error
    });

    it('should reject negative duration', () => {
        // Should default to 0.375 or throw error
    });

    it('should cap duration at 60 seconds', () => {
        // duration=100 should become 60
    });

    it('should ensure minimum 9 frames', () => {
        // duration=0.1 (2 frames) should become 9 frames
    });
});
```

---

## 📚 FAL AI API SPECIFICATION

**Endpoint**: `https://queue.fal.run/fal-ai/ltxv-13b-098-distilled/image-to-video`

**Required Parameters**:
- `prompt` (string): Text guidance
- `image_url` (string): Image URL for conditioning

**Optional Parameters**:
- `num_frames` (integer): Range [9, 1441], default 121
- `frame_rate` (integer): Range [1, 60], default 24
- `resolution` (string): "480p" | "720p", default "720p"
- `aspect_ratio` (string): "9:16" | "1:1" | "16:9" | "auto", default "auto"
- `negative_prompt` (string)
- `seed` (integer): For reproducible results
- Many more...

**Image Format Support**: jpg, jpeg, png, webp, gif, avif

**Pricing**: $0.02/second at 24 fps

**Limits**:
- Minimum duration: 0.375 seconds (9 frames)
- Maximum duration: 60.04 seconds (1441 frames)

---

## 🎯 CONCLUSION

The **primary cause** of 422 errors is:
1. **Array inputs from parallel nodes** (80% of failures)
2. **Invalid num_frames values** when duration < 0.375s (potential issue)

**Immediate Action for Users**:
- Disable "Run items in parallel" for image_to_video node when using with parallel text_to_image
- Ensure duration is at least 0.4 seconds

**Code Fixes Needed**:
1. Handle array inputs (take first element or split into multiple requests)
2. Validate num_frames minimum value (9 frames)
3. Improve error messages to show validation details
4. Add frontend validation for duration field

---

**Sources**:
- [LTX-Video 13B 0.9.8 Distilled | Image to Video | fal.ai](https://fal.ai/models/fal-ai/ltxv-13b-098-distilled/image-to-video)
- Workflow History Analysis
- Backend Code Review
- Fal AI API Documentation
