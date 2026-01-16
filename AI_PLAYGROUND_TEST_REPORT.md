# AI Playground Submission Feature Test Report

**Test Date**: 2026-01-15
**Test Environment**: http://workflow.localhost
**Tester**: QA Automation Agent
**Browser**: agent-browser CLI tool

---

## Executive Summary

Tested three AI Playground submission types: Sound Effects, Face Swap, and Lip Sync. All three tests **FAILED** due to missing environment configuration (`CONTENT_SERVICE_URL`). Additionally, discovered a critical UI bug in the Lip Sync feature where video and audio input fields do not render.

**Overall Result**: FAIL

**Critical Issues Found**:
1. Missing `CONTENT_SERVICE_URL` environment variable blocks all three features
2. Lip Sync form has a rendering bug - video/audio input fields not displayed

---

## Test 1: Sound Effects (video_sound_effects)

### Test Result: FAIL

### Summary
Attempted to generate sound effects using text prompt. Form accepted input and submitted successfully, but execution failed due to missing external content service configuration.

### Steps Executed
1. Navigated to AI Playground at http://workflow.localhost
2. Selected "Sound Effects" capability from dropdown
3. Filled form fields:
   - **Prompt**: "Thunder and rain sound effects with dramatic atmosphere"
   - **Duration (sec)**: 5
   - **Sync to Video**: (left empty - optional field)
4. Clicked "Run Model" button
5. Waited for processing to complete

### Form Fields Used
- **Prompt** (textarea): Text description of desired sound effects
- **Duration (sec)** (number): Length of audio output in seconds
- **Sync to Video** (video file): Optional video file to sync audio with

### Submission Status
- Form submission: SUCCESS
- Backend processing: FAILED
- Error received after ~10 seconds

### Artifacts Generated
- **Screenshots**:
  - `test-screenshots/sound_effects/01-initial.png` - Initial form state
  - `test-screenshots/sound_effects/02-form-loaded.png` - Form loaded with fields visible
  - `test-screenshots/sound_effects/03-form-filled.png` - Completed form before submission
  - `test-screenshots/sound_effects/04-loading.png` - Loading state during processing
  - `test-screenshots/sound_effects/05-error-result.png` - Error message displayed

### Processing Time
- Submission to error: ~10 seconds

### Error Encountered
```
Node type "video_sound_effects" requires external content service.
Set CONTENT_SERVICE_URL environment variable.
```

### Root Cause
The backend requires an external content service URL to process sound effects generation. This environment variable is not set in the current deployment.

### Recommendations
1. **Immediate**: Set `CONTENT_SERVICE_URL` environment variable in backend configuration
2. **Short-term**: Add validation to check for required environment variables on startup
3. **Long-term**: Provide clearer error messages indicating missing configuration vs runtime errors
4. **Documentation**: Update deployment docs to list all required environment variables

---

## Test 2: Face Swap

### Test Result: FAIL

### Summary
Attempted to swap faces between two images using generated AI image and test file. Form accepted URLs successfully, but execution failed due to missing external content service configuration.

### Steps Executed
1. Generated source face image using Text To Image feature
   - Prompt: "Professional headshot of a smiling businesswoman with dark hair in modern office"
   - Model: fal-ai/flux/schnell
   - Successfully generated image at: `https://v3b.fal.media/files/b/0a8a6f27/0gJg0ibDZochEbO3cGtub.jpg`
2. Switched to Face Swap capability
3. Filled form fields:
   - **Target Image**: http://workflow-api.localhost/output/test-image.jpg
   - **Source Face**: https://v3b.fal.media/files/b/0a8a6f27/0gJg0ibDZochEbO3cGtub.jpg
   - **Face Enhance**: (default toggle state)
4. Clicked "Run Model" button
5. Waited for processing to complete

### Form Fields Used
- **Target Image** (image URL/upload): The base image where face will be replaced
- **Source Face** (image URL/upload): The face to transplant onto target image
- **Face Enhance** (toggle): Option to enhance facial features in output

### Submission Status
- Form submission: SUCCESS
- Backend processing: FAILED
- Error received after ~8 seconds

### Artifacts Generated
- **Screenshots**:
  - `test-screenshots/face_swap/01-form-loaded.png` - Initial Face Swap form
  - `test-screenshots/face_swap/02-generated-source-face.png` - Generated face image from Text To Image
  - `test-screenshots/face_swap/03-form-filled.png` - Form with both image URLs entered
  - `test-screenshots/face_swap/04-loading.png` - Loading state during processing
  - `test-screenshots/face_swap/05-error-result.png` - Error message displayed
- **Generated Assets**:
  - Source face image: `https://v3b.fal.media/files/b/0a8a6f27/0gJg0ibDZochEbO3cGtub.jpg`

### Processing Time
- Text To Image generation: ~15 seconds (SUCCESS)
- Face Swap submission to error: ~8 seconds (FAILED)

### Error Encountered
```
Node type "face_swap" requires external content service.
Set CONTENT_SERVICE_URL environment variable.
```

### Root Cause
Same as Sound Effects - the backend requires an external content service URL that is not configured.

### Recommendations
1. **Immediate**: Set `CONTENT_SERVICE_URL` environment variable in backend configuration
2. **Testing**: After configuration, retest with same image URLs to verify functionality
3. **Validation**: Add client-side validation to ensure both image URLs are valid before submission

---

## Test 3: Lip Sync

### Test Result: FAIL

### Summary
Attempted to test lip sync feature but encountered a critical UI bug where video and audio input fields do not render. Despite missing inputs, form submission was possible and resulted in the same configuration error.

### Steps Executed
1. Switched to Lip Sync capability
2. Observed form rendering issue - Video File and Audio File inputs missing
3. Form showed only:
   - Labels for "Video File" and "Audio File" (no input fields)
   - Model dropdown (SadTalker, HeyGen, SyncLabs)
4. Attempted submission with only Model selected (SadTalker)
5. Submission processed and returned error

### Form Fields Expected (from schema)
- **Video File** (video URL/upload): Video file for lip sync
- **Audio File** (audio URL/upload): Audio track to sync with video
- **Model** (select): Lip sync model to use

### Form Fields Actually Rendered
- **Model** (select): ✓ Rendered correctly
- **Video File**: ✗ NOT RENDERED (only label visible)
- **Audio File**: ✗ NOT RENDERED (only label visible)

### Submission Status
- Form rendering: FAILED (missing inputs)
- Form submission: SUCCESS (submitted with empty video/audio fields)
- Backend processing: FAILED (configuration error)

### Artifacts Generated
- **Screenshots**:
  - `test-screenshots/lip_sync/01-form-loaded.png` - Initial Lip Sync form showing bug
  - `test-screenshots/lip_sync/02-form-bug-no-inputs.png` - Close-up of missing input fields
  - `test-screenshots/lip_sync/03-missing-video-audio-inputs.png` - Labels without inputs
  - `test-screenshots/lip_sync/04-loading.png` - Loading state (despite missing data)
  - `test-screenshots/lip_sync/05-error-result.png` - Configuration error message

### Processing Time
- Submission to error: ~12 seconds

### Errors Encountered

**Primary Error (Configuration)**:
```
Node type "lip_sync" requires external content service.
Set CONTENT_SERVICE_URL environment variable.
```

**Secondary Error (UI Bug)**:
Video and Audio input fields not rendering. Root cause identified in code:

**File**: `/Users/balpreetsingh/conductor/workspaces/amc-v1/west-monroe/src/components/AIPlayground.tsx`

**Line 305-308**:
```typescript
{(field.type === 'text' || field.type === 'number' || field.type === 'file' || field.type === 'image') && (
    <div className="input-group">
        <input ... />
    </div>
)}
```

**Problem**: The condition checks for `'file'` and `'image'` but NOT for `'video'` or `'audio'` field types.

**Schema Definition** (from NodePropertiesPanel.tsx, line 86-90):
```typescript
'lip_sync': [
    { name: 'videoUrl', label: 'Video File', type: 'video' },  // <-- 'video' type
    { name: 'audioUrl', label: 'Audio File', type: 'audio' },  // <-- 'audio' type
    { name: 'model', label: 'Model', type: 'select', options: ['SadTalker', 'HeyGen', 'SyncLabs'] }
],
```

### Root Causes
1. **Configuration Issue**: Missing `CONTENT_SERVICE_URL` environment variable (same as other features)
2. **Code Bug**: AIPlayground component does not handle `'video'` and `'audio'` field types, only `'file'` and `'image'`

### Recommendations

**Critical - Code Fix Required**:
```typescript
// BEFORE (line 305):
{(field.type === 'text' || field.type === 'number' || field.type === 'file' || field.type === 'image') && (

// AFTER (recommended fix):
{(field.type === 'text' || field.type === 'number' || field.type === 'file' || field.type === 'image' || field.type === 'video' || field.type === 'audio') && (
```

**Or better, use array includes**:
```typescript
{['text', 'number', 'file', 'image', 'video', 'audio'].includes(field.type) && (
```

**Additional Recommendations**:
1. **Immediate**: Fix rendering condition to include 'video' and 'audio' types
2. **Testing**: Add unit tests for all field type rendering
3. **Validation**: Add client-side validation to prevent submission with missing required fields
4. **Configuration**: Set `CONTENT_SERVICE_URL` environment variable
5. **Code Review**: Audit all form field type handlers for completeness

---

## Summary Table

| Feature | Form Rendered | Submission | Backend Processing | Overall Result |
|---------|---------------|------------|-------------------|----------------|
| Sound Effects | ✓ | ✓ | ✗ (Config Error) | FAIL |
| Face Swap | ✓ | ✓ | ✗ (Config Error) | FAIL |
| Lip Sync | ✗ (UI Bug) | ✓ | ✗ (Config Error) | FAIL |

---

## Critical Issues Summary

### Issue 1: Missing CONTENT_SERVICE_URL Configuration
- **Severity**: Critical
- **Impact**: Blocks all three tested features (Sound Effects, Face Swap, Lip Sync)
- **Affected Components**: Backend workflow execution
- **Fix**: Set environment variable in backend deployment
- **ETA**: < 5 minutes (configuration change)

### Issue 2: Lip Sync Form Rendering Bug
- **Severity**: Critical
- **Impact**: Users cannot input video/audio files for lip sync
- **Affected Components**: Frontend AIPlayground component
- **Fix**: Update field type condition on line 305 of AIPlayground.tsx
- **ETA**: < 10 minutes (code change + testing)

### Issue 3: Error Messages Not User-Friendly
- **Severity**: Medium
- **Impact**: Technical error messages exposed to end users
- **Recommendation**: Wrap configuration errors in user-friendly messages
- **Example**: "This feature is currently unavailable. Please contact support."

---

## Next Steps

1. **Immediate Actions**:
   - Set `CONTENT_SERVICE_URL` environment variable in backend/.env
   - Fix AIPlayground.tsx line 305 to handle 'video' and 'audio' field types
   - Restart backend and frontend services

2. **Verification Testing**:
   - Re-run all three tests after fixes applied
   - Verify video/audio inputs render correctly in Lip Sync form
   - Test actual feature functionality (sound generation, face swap, lip sync)

3. **Long-term Improvements**:
   - Add comprehensive field type test coverage
   - Implement better error handling and user messaging
   - Add environment variable validation on startup
   - Create deployment checklist with required environment variables

---

## Test Artifacts Location

All screenshots saved to: `/Users/balpreetsingh/conductor/workspaces/amc-v1/west-monroe/test-screenshots/`

- `sound_effects/` - 5 screenshots
- `face_swap/` - 5 screenshots
- `lip_sync/` - 5 screenshots

**Total Screenshots**: 15 images documenting full test execution flow

---

## Conclusion

While the submission feature technically works (forms accept input and submit to backend), all three tested playground types are currently **non-functional** due to missing backend configuration. Additionally, the Lip Sync feature has a critical UI bug preventing proper testing.

**Recommended Priority**:
1. Fix Lip Sync UI bug (10 min)
2. Configure CONTENT_SERVICE_URL (5 min)
3. Retest all three features
4. Implement better error handling

**Estimated Time to Resolution**: 30 minutes (code fix + configuration + retesting)
