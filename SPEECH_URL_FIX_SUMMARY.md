# Speech URL Fix - Implementation Summary

## Problem
Speech URLs were failing with `HTTP 404: http://localhost:8080/output/speech_openai_xxx.mp3` because:
- OpenAI TTS saved files locally and returned localhost URLs
- Node 10 tried to download via HTTP request in Docker
- Localhost networking failed → 404 error

## Solution Implemented

### 1. Speech Generator Changes (`backend/generators/speech.js`)

**FAL AI TTS (Primary):**
- ✅ Returns external URL directly: `https://v3b.fal.media/files/.../audio.mp3`
- ✅ No local download until Node 10 composition
- ✅ Consistent with video and music generators

**OpenAI TTS (Fallback):**
- ✅ Saves to local filesystem (required - OpenAI returns binary data)
- ✅ Returns **absolute filesystem path**: `/home/app/output/speech_openai_xxx.mp3`
- ✅ No localhost URLs → no HTTP requests
- ✅ downloadFile() copies directly from filesystem

### 2. Server Changes (`backend/server.js`)

**text_to_speech processor:**
- ✅ Removed URL normalization code
- ✅ Passes through audioUrl as-is (external URL or filesystem path)
- ✅ Added logging for debugging

### 3. No Changes Needed

**ffmpeg.js downloadFile() function:**
- ✅ Already handles external URLs (downloads via HTTPS)
- ✅ Already handles filesystem paths (copies directly)
- ✅ Line 44: Detects paths starting with `/` as local files
- ✅ Lines 46-63: Copies local files without HTTP requests

## Result

### Before:
```
Node 6 (Speech) → Saves to /output/file.mp3
                → Returns http://localhost:8080/output/file.mp3
                → Node 10 tries HTTP GET
                → ❌ 404 Error (localhost networking fails in Docker)
```

### After:
```
Node 6 (Speech - FAL AI) → Returns https://v3b.fal.media/.../audio.mp3
                         → Node 10 downloads via HTTPS
                         → ✅ Success

Node 6 (Speech - OpenAI) → Saves to /home/app/output/file.mp3
                         → Returns /home/app/output/file.mp3
                         → Node 10 copies from filesystem
                         → ✅ Success (no HTTP request)
```

## Benefits

✅ **Consistent**: Speech works like video and music (external URLs for FAL)
✅ **Robust**: No localhost HTTP requests that fail in Docker
✅ **Efficient**: No duplicate downloads
✅ **Simple**: Clean code, no complex normalization
✅ **Works Everywhere**: Local dev, Docker, production

## Testing

1. **Test with FAL AI TTS** (recommended):
   - Use model: `fal-ai/playht/tts/v3`
   - Should return external URL
   - Node 10 downloads via HTTPS

2. **Test with OpenAI TTS**:
   - Use model: `openai-tts`
   - Should return filesystem path
   - Node 10 copies from filesystem

3. **Test Node 10 merge**:
   - Multiple videos from Node 8 (external URLs)
   - Multiple speech from Node 6 (external URLs or filesystem paths)
   - Music from Node 5 (external URL)
   - Should merge successfully without 404 errors

## Files Modified

- `backend/generators/speech.js` - Returns filesystem paths for OpenAI TTS
- `backend/server.js` - Simplified text_to_speech processor

## Files NOT Modified

- `backend/generators/ffmpeg.js` - Already handles both URL types correctly
- `backend/generators/video.js` - No changes needed
- `backend/generators/music.js` - No changes needed
