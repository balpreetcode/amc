const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://workflow.localhost';
const TEST_TIMEOUT = 90000;

const MODEL_TYPES = [
  'text_to_text',
  'text_to_image',
  'text_to_video',
  'text_to_music',
  'text_to_speech',
  'image_to_video',
  'image_to_image',
  'face_swap',
  'lip_sync',
  'ai_avatar',
  'enhancer',
  'split_text',
  'image_object_removal',
  'image_remove_background',
  'video_sound_effects',
  'edit_video',
  'clip_merger'
];

async function testModel(page, modelType) {
  const result = {
    modelName: modelType,
    status: 'FAIL',
    artifactType: null,
    error: null
  };

  try {
    console.log('\n=== Testing ' + modelType + ' ===');

    const dropdown = await page.locator('select.playground-select').first();
    await dropdown.selectOption(modelType);
    await page.waitForTimeout(1500);

    const textInputs = await page.locator('input[type="text"]').all();
    for (const input of textInputs) {
      const isVisible = await input.isVisible();
      if (isVisible) {
        const currentValue = await input.inputValue();
        if (!currentValue || currentValue === '') {
          await input.fill('test');
        }
      }
    }

    const textareas = await page.locator('textarea.playground-textarea').all();
    for (const textarea of textareas) {
      const isVisible = await textarea.isVisible();
      if (isVisible) {
        const currentValue = await textarea.inputValue();
        if (!currentValue || currentValue === '') {
          await textarea.fill('test');
        }
      }
    }

    const numberInputs = await page.locator('input[type="number"]').all();
    for (const input of numberInputs) {
      const isVisible = await input.isVisible();
      if (isVisible) {
        const currentValue = await input.inputValue();
        if (!currentValue || currentValue === '') {
          await input.fill('512');
        }
      }
    }

    const selects = await page.locator('select.playground-select').all();
    for (let i = 1; i < selects.length; i++) {
      const select = selects[i];
      const isVisible = await select.isVisible();
      if (isVisible) {
        const options = await select.locator('option').all();
        if (options.length > 0) {
          const value = await options[0].getAttribute('value');
          if (value) {
            await select.selectOption(value);
          }
        }
      }
    }

    console.log('  Clicking Run Model...');
    const runButton = await page.locator('button.run-button');
    await runButton.click();

    console.log('  Waiting for result (up to 90s)...');

    let detectedType = null;
    let detectedError = null;
    
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(1000);
      
      const errorExists = await page.locator('.error-message').count() > 0;
      if (errorExists) {
        const errorElem = await page.locator('.error-message p').first();
        detectedError = await errorElem.textContent();
        break;
      }
      
      const videoCount = await page.locator('video[src]').count();
      if (videoCount > 0) {
        detectedType = 'video';
        break;
      }
      
      const imageCount = await page.locator('.media-viewer img[src]').count();
      if (imageCount > 0) {
        detectedType = 'image';
        break;
      }
      
      const audioCount = await page.locator('audio[src]').count();
      if (audioCount > 0) {
        detectedType = 'audio';
        break;
      }
      
      const textViewerCount = await page.locator('.text-viewer').count();
      if (textViewerCount > 0) {
        const textContent = await page.locator('.text-viewer').first().textContent();
        if (textContent && !textContent.includes('Run the model')) {
          detectedType = 'text';
          break;
        }
      }
      
      const isStillGenerating = await page.locator('button.run-button:has-text("Generating")').count() > 0;
      if (!isStillGenerating && i > 5) {
        break;
      }
    }

    if (detectedError) {
      result.error = detectedError;
      console.log('  Error: ' + detectedError);
    } else if (detectedType) {
      result.status = 'PASS';
      result.artifactType = detectedType;
      console.log('  Success! Artifact type: ' + detectedType);
    } else {
      result.error = 'No result detected after timeout';
      console.log('  Error: No result detected');
    }

  } catch (error) {
    result.error = error.message;
    console.log('  Error: ' + error.message);
  }

  return result;
}

async function runTests() {
  console.log('Starting AI Playground Model Tests...\n');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  try {
    console.log('Navigating to ' + BASE_URL + '/playground');
    await page.goto(BASE_URL + '/playground', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    for (const modelType of MODEL_TYPES) {
      const result = await testModel(page, modelType);
      results.push(result);
      
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await browser.close();
  }

  console.log('\n\n=== TEST SUMMARY ===\n');
  console.log('| Model Type                | Status | Artifact Type | Error                                             |');
  console.log('|---------------------------|--------|---------------|---------------------------------------------------|');

  for (const result of results) {
    const error = result.error ? result.error.substring(0, 50) : '-';
    const modelName = result.modelName.padEnd(25);
    const status = result.status.padEnd(6);
    const artifactType = (result.artifactType || '-').padEnd(13);
    console.log('| ' + modelName + ' | ' + status + ' | ' + artifactType + ' | ' + error.padEnd(49) + ' |');
  }

  const reportPath = '/Users/balpreetsingh/conductor/workspaces/amc-v1/west-monroe/test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('\n\nFull results saved to: ' + reportPath);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('\nTotal: ' + results.length + ' | Passed: ' + passed + ' | Failed: ' + failed);
}

runTests().catch(console.error);
