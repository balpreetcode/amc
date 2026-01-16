# Testing: AI Playground

## Preconditions
- Application is running at http://localhost:3465
- Backend API is accessible at the configured endpoint
- User has navigated to the AI Playground screen via the application navigation
- No workflows or executions are in progress
- Browser viewport is at least 1280px wide for proper two-panel layout

## Test Data
- **Text input**: "A serene mountain landscape at sunset"
- **Prompt**: "Generate a futuristic city with flying cars"
- **Sample image file**: test-image.jpg (any valid JPG, ~500KB)
- **Sample video file**: test-video.mp4 (any valid MP4, ~2MB)
- **Sample audio file**: test-audio.mp3 (any valid MP3, ~1MB)
- **Number value**: 512 (for dimension fields)
- **Slider value**: 7.5 (for guidance_scale fields)

## Scenarios

### Scenario 1: Model Selection and Form Reset
**Steps:**
1. Navigate to http://localhost:3465/playground
2. Verify the model dropdown displays "Select Model Type" as default
3. Click the model dropdown and select "Text to Image"
4. Enter "Test prompt" in the prompt field that appears
5. Click the model dropdown again and select "Text to Video"
6. Observe the form fields

**Expected:**
- AI Playground header is visible with subtitle "Test AI models in isolation"
- Model dropdown lists 15 model types (text_to_text, text_to_image, text_to_video, text_to_music, text_to_speech, image_to_video, image_to_image, face_swap, lip_sync, ai_avatar, enhancer, split_text, image_object_removal, image_remove_background, video_sound_effects)
- After selecting "Text to Image", form displays fields specific to image generation (prompt, model selection, dimensions)
- After switching to "Text to Video", previous "Test prompt" input is cleared and form shows video-specific fields
- Two-panel layout is visible with configuration panel on left (~400px) and results panel on right

### Scenario 2: Dynamic Form Field Validation
**Steps:**
1. Navigate to http://localhost:3465/playground
2. Select "Text to Text" from model dropdown
3. Leave the prompt field empty
4. Click the "Run Model" button
5. Enter "Generate a story about robots" in the prompt field
6. Observe the "Run Model" button state

**Expected:**
- "Run Model" button is disabled (gray appearance, no hover effect) when prompt field is empty
- Browser validation message appears indicating "Please fill out this field"
- After entering valid prompt text, "Run Model" button becomes enabled (blue background, hover effect active)
- Button displays text "Run Model" with play icon

### Scenario 3: File Upload with Progress Indicator
**Steps:**
1. Navigate to http://localhost:3465/playground
2. Select "Image to Video" from model dropdown
3. Click the "Choose File" button for the image input field
4. Select a valid test-image.jpg file from local system
5. Observe the upload progress indicator
6. Wait for upload to complete

**Expected:**
- File input field displays "Choose File" button initially
- After file selection, upload progress indicator appears showing percentage (0% to 100%)
- Progress bar fills from left to right during upload
- Upon completion, file name "test-image.jpg" displays next to input field
- Form becomes valid and "Run Model" button is enabled
- No error messages appear

### Scenario 4: Slider Field with Value Display
**Steps:**
1. Navigate to http://localhost:3465/playground
2. Select "Text to Image" from model dropdown
3. Locate the slider field (typically labeled "guidance_scale" or similar)
4. Drag the slider handle to the middle position
5. Observe the displayed value
6. Drag the slider to minimum position
7. Drag the slider to maximum position

**Expected:**
- Slider displays current numeric value next to or above the slider control
- Moving slider to middle shows value around 7.5 (or midpoint of range)
- Value updates in real-time as slider is dragged
- Minimum position shows lowest value (e.g., 1.0)
- Maximum position shows highest value (e.g., 20.0)
- Slider handle moves smoothly without jumping

### Scenario 5: Execution Flow and Results Display
**Steps:**
1. Navigate to http://localhost:3465/playground
2. Select "Text to Text" from model dropdown
3. Enter "Write a haiku about artificial intelligence" in the prompt field
4. Click "Run Model" button
5. Observe the button state and results panel
6. Wait for execution to complete (or timeout after 10 seconds for this test)

**Expected:**
- Before execution, results panel shows placeholder message "Results will appear here after running a model"
- Upon clicking "Run Model", button text changes to "↻ Generating..." with rotating icon
- "Run Model" button becomes disabled during execution
- Results panel transitions to loading state with spinner or progress indicator
- Status polling begins (can observe network requests every 1 second in browser dev tools)
- After completion or timeout, button returns to enabled "Run Model" state
- If successful, results panel displays generated text output in readable format
- If failed/timeout, error message appears in results panel with red styling
