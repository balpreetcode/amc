# AI Playground - Critical Bug Fixes Required

**Priority:** P0 (Blocking Production Deployment)
**Affected Component:** AI Playground submission feature
**Test Date:** 2026-01-15

---

## Critical Bug #1: Capability Selection Doesn't Persist

**Severity:** 🔴 CRITICAL (Blocks all playground executions)

**Description:**
When user selects a capability type (e.g., "text_to_speech") and clicks "Run Model", the selection changes to a different type during submission, causing wrong generators to execute.

**Impact:**
- Users cannot reliably execute any capability type
- Results are unpredictable (audio request returns text/images)
- Complete feature failure

**Evidence:**
- File: `test-screenshots/text_to_speech/06-incorrect-result-text-to-text.png`
- File: `test-screenshots/text_to_speech/09-results.png`

**Location:** `src/components/AIPlayground.tsx`

**Suspected Code:** Lines 99-145 in `handleExecute` function

**Hypothesis:**
The `selectedNodeType` state is being mutated or reset during the execution flow. Possible causes:
1. State update race condition during async execution
2. Form reset triggering state change
3. Event handler side effects modifying state

**Fix Steps:**
1. Add console.log in `handleExecute` to track `selectedNodeType` value
2. Use `useRef` to store capability type before submission
3. Ensure state doesn't change between submission and execution
4. Add state snapshot at submission time

**Code Suggestion:**
```typescript
const handleExecute = async () => {
    // Capture state immediately to prevent race conditions
    const executionNodeType = selectedNodeType;
    const executionFormData = { ...formData };
    
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
        const tempNode = createNode(executionNodeType); // Use snapshot
        tempNode.config = executionFormData; // Use snapshot
        // ... rest of execution
    }
    // ...
}
```

---

## Critical Bug #2: Image Input Fields Don't Capture Values

**Severity:** 🔴 CRITICAL (Blocks all image-based capabilities)

**Description:**
Text input fields for image URLs and file uploads don't properly update the React `formData` state, resulting in "No input image provided" errors even when fields are filled.

**Impact:**
- Cannot use: image_to_video, image_to_image, face_swap, lip_sync, enhancer
- File uploads fail silently
- Manual URL entry doesn't work

**Evidence:**
- File: `test-screenshots/image_to_video/05-error-no-image.png`
- File: `test-screenshots/image_to_image/04-error-no-image.png`

**Location:** `src/components/AIPlayground.tsx`

**Affected Code:** Lines 305-339 (input rendering)

**Root Cause:**
React controlled component pattern `value={formData[field.name] || ''}` means the input value is bound to state. DOM manipulation doesn't trigger React's `onChange` handler, so state never updates.

**Workaround Found (Not User-Friendly):**
```javascript
// This works but users can't do this manually
const input = document.querySelector("input");
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 
  "value"
).set;
nativeSetter.call(input, "value");
input.dispatchEvent(new Event("input", { bubbles: true }));
```

**Recommended Fix Options:**

### Option A: Use Uncontrolled Components (Quick Fix)
```typescript
{(field.type === 'text' || field.type === 'image') && (
    <input
        type="text"
        className="playground-input"
        defaultValue={formData[field.name] || ''}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder={field.type === 'image' ? 'Paste Image URL or Upload...' : ''}
    />
)}
```

### Option B: Better Event Handling (Proper Fix)
Ensure `onChange` fires for all input methods:
```typescript
<input
    type="text"
    className="playground-input"
    value={formData[field.name] || ''}
    onChange={(e) => handleFieldChange(field.name, e.target.value)}
    onBlur={(e) => handleFieldChange(field.name, e.target.value)} // Backup
    placeholder={field.type === 'image' ? 'Paste Image URL or Upload...' : ''}
/>
```

### Option C: Use Refs (Most Robust)
```typescript
const imageInputRef = useRef<HTMLInputElement>(null);

// On submit, read directly from ref
const getFormData = () => {
    const data = { ...formData };
    if (imageInputRef.current) {
        data.imageUrl = imageInputRef.current.value;
    }
    return data;
};
```

**Testing After Fix:**
1. Type URL manually into image field
2. Verify console shows `formData` updated
3. Submit and verify no "No input image provided" error
4. Test with different image URLs

---

## Bug #3: File Upload Not Working

**Severity:** 🟡 HIGH

**Description:**
File upload button doesn't successfully upload files to backend or populate the URL in form state.

**Impact:**
- Users cannot upload local images for image-based capabilities
- Must rely on external URLs (which also don't work due to Bug #2)

**Evidence:**
- File: `test-screenshots/image_to_video/02-image-uploaded.png`

**Location:** `src/components/AIPlayground.tsx` lines 59-96

**Code to Investigate:**
```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const formData = new FormData();
        formData.append('file', file);

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        // ... error handling ...
        const data = await response.json();
        handleFieldChange(fieldName, data.url); // <-- Does this execute?
    } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload file');
    }
}
```

**Investigation Steps:**
1. Add console.log at start of `handleFileUpload`
2. Check if `/upload` endpoint returns 200 status
3. Verify `data.url` format from response
4. Ensure `handleFieldChange` is called with correct params
5. Check browser Network tab for upload request

**Potential Issues:**
- `/upload` endpoint not accessible (CORS or path issue)
- Backend returns different response format
- `handleFieldChange` not updating state properly (related to Bug #2)
- File input event not firing

---

## Bug #4: Backend 400 Error on Image-to-Image

**Severity:** 🟡 HIGH

**Description:**
After fixing input capture (Bug #2), image-to-image returns "Request failed with status code 400" from backend.

**Impact:**
- Even with form data captured correctly, execution still fails
- Backend validation or API integration issue

**Evidence:**
- File: `test-screenshots/image_to_image/07-error-400.png`

**Location:** Backend - `backend/generators/image-to-image.js`

**Investigation Needed:**
1. Check what data backend receives in request body
2. Verify image URL format requirements
3. Check AI model API parameter validation
4. Ensure all required fields are present

**Backend Logging:**
Add detailed logging to image-to-image generator:
```javascript
async function generateImageToImage(config) {
    console.log('Received config:', JSON.stringify(config, null, 2));
    
    if (!config.imageUrl) {
        throw new Error('No input image provided');
    }
    
    console.log('Making API request to:', MODEL_API_URL);
    // ... rest of logic
}
```

---

## Testing Checklist (After Fixes)

### For Each Capability Type:

- [ ] Select capability from dropdown
- [ ] Fill all required fields
- [ ] Verify form data in React DevTools
- [ ] Click "Run Model"
- [ ] Verify capability type doesn't change
- [ ] Check loading indicator appears
- [ ] Wait for completion
- [ ] Verify correct result type (audio for TTS, video for I2V, etc.)
- [ ] Check no errors in console
- [ ] Test with different models/parameters

### Specific Tests:

**Text To Speech:**
- [ ] Text content fills properly
- [ ] Language selection works
- [ ] Voice dropdown populates (currently empty)
- [ ] Model selection persists
- [ ] Returns audio file (.wav or .mp3)

**Image To Video:**
- [ ] Image URL input captures value
- [ ] File upload works
- [ ] Motion prompt fills
- [ ] Numeric inputs work (intensity, duration, seed)
- [ ] Returns video file (.mp4)

**Image To Image:**
- [ ] Image URL input captures value
- [ ] Prompt fills properly
- [ ] Strength slider updates state
- [ ] Returns transformed image

---

## Regression Testing

After fixes, verify these still work:
- [ ] Text To Text (baseline - was working)
- [ ] Text To Image (had issues in testing)
- [ ] All other capability types
- [ ] Template loading
- [ ] Workflow canvas (unrelated but verify)

---

## Priority Order

1. **Fix Bug #1** (Capability Selection) - P0
   - Blocks ALL capability types
   - Quick fix possible (state snapshot)
   
2. **Fix Bug #2** (Image Input) - P0
   - Blocks 5+ capability types
   - Multiple fix options available
   
3. **Fix Bug #3** (File Upload) - P1
   - Can work around with URLs if Bug #2 fixed
   - Important for UX but not blocking
   
4. **Fix Bug #4** (Backend 400) - P1
   - Only appears after Bug #2 fixed
   - Backend investigation needed

---

## Acceptance Criteria

Feature is ready for production when:
- ✅ All 3 test types (TTS, I2V, I2I) execute successfully
- ✅ Correct output type returned for each capability
- ✅ File upload works for image inputs
- ✅ No console errors during execution
- ✅ Loading states display correctly
- ✅ Error messages are user-friendly
- ✅ All 16 capability types tested manually

---

## Contact

For questions about this testing report, refer to:
- Full Test Report: `AI_PLAYGROUND_TEST_REPORT.md`
- Screenshots: `test-screenshots/` directory
- Test Code: Agent-browser automation logs
