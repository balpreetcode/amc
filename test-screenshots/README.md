# AI Playground Test Screenshots

This directory contains screenshots from automated testing of the AI Playground submission features.

## Test Date
2026-01-15

## Directory Structure

```
test-screenshots/
├── text_to_speech/      # 10 screenshots - FAIL (selection bug)
├── image_to_video/      # 7 screenshots - FAIL (input capture bug)
├── image_to_image/      # 7 screenshots - PARTIAL FAIL (400 error)
└── [other types]/       # Not tested in this session
```

## Screenshot Naming Convention

- `00-` prefix: Initial state
- `01-09-` prefix: Sequential test steps
- Descriptive names: `form-filled`, `generating`, `error-*`, `results`

## Quick Access to Key Findings

### Text To Speech Bug Evidence
- `text_to_speech/06-incorrect-result-text-to-text.png` - Shows text output instead of audio
- `text_to_speech/09-results.png` - Shows image output instead of audio
- **Bug:** Capability selection switches during submission

### Image To Video Bug Evidence
- `image_to_video/05-error-no-image.png` - "No input image provided" error
- `image_to_video/03-form-filled.png` - Shows all fields filled but image not captured
- **Bug:** Image input field not updating React state

### Image To Image Progress
- `image_to_image/04-error-no-image.png` - Initial error (no image)
- `image_to_image/07-error-400.png` - Improved to 400 error (image captured)
- **Status:** Form capture partially fixed, backend validation issue remains

## View Full Report

See `AI_PLAYGROUND_TEST_REPORT.md` in project root for complete test analysis.

## Screenshot Statistics

| Type | Count | Status |
|------|-------|--------|
| text_to_speech | 10 | ❌ FAIL |
| image_to_video | 7 | ❌ FAIL |
| image_to_image | 7 | ⚠️ PARTIAL |
| **Total** | **24** | **0/3 Passed** |
