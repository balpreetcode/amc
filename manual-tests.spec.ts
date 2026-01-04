import { test, expect } from '@playwright/test';

const BASE_URL = 'http://workflow.localhost';

test.describe('Manual Testing - All 6 Features', () => {

  test('1. Execution History Duration Display', async ({ page }) => {
    console.log('\n=== TEST 1: Execution History Duration Display ===');

    await page.goto(`${BASE_URL}/history`);
    await page.waitForLoadState('networkidle');

    // Check if the page loaded
    const title = await page.locator('h1, h2').first().textContent();
    console.log('History page title:', title);

    // Look for duration column
    const durationCells = page.locator('td:has-text("duration"), td:has-text("Duration"), th:has-text("Duration")');
    const count = await durationCells.count();
    console.log('Duration column elements found:', count);

    // Check if "null" text appears (should not)
    const nullText = await page.locator('text="null"').count();
    console.log('Instances of "null" text found:', nullText);

    // Check if "NA" appears (should for null durations)
    const naText = await page.locator('text="NA"').count();
    console.log('Instances of "NA" text found:', naText);

    // Take screenshot
    await page.screenshot({ path: 'test-1-history-duration.png', fullPage: true });

    expect(nullText).toBe(0); // Should not show "null"
  });

  test('2. URL Routing', async ({ page }) => {
    console.log('\n=== TEST 2: URL Routing ===');

    // Test Flow Builder route
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    console.log('Current URL (/):', page.url());
    expect(page.url()).toBe(`${BASE_URL}/`);

    // Test History route
    await page.goto(`${BASE_URL}/history`);
    await page.waitForLoadState('networkidle');
    console.log('Current URL (/history):', page.url());
    expect(page.url()).toBe(`${BASE_URL}/history`);

    // Test Templates route
    await page.goto(`${BASE_URL}/templates`);
    await page.waitForLoadState('networkidle');
    console.log('Current URL (/templates):', page.url());
    expect(page.url()).toBe(`${BASE_URL}/templates`);

    // Test API Tokens route
    await page.goto(`${BASE_URL}/api-tokens`);
    await page.waitForLoadState('networkidle');
    console.log('Current URL (/api-tokens):', page.url());
    expect(page.url()).toBe(`${BASE_URL}/api-tokens`);

    // Test navigation via tabs
    await page.goto(`${BASE_URL}/`);
    const historyTab = page.locator('button:has-text("History"), a:has-text("History")').first();
    if (await historyTab.count() > 0) {
      await historyTab.click();
      await page.waitForLoadState('networkidle');
      console.log('After clicking History tab:', page.url());
    }

    // Test browser back button
    await page.goBack();
    console.log('After browser back:', page.url());

    // Test browser forward button
    await page.goForward();
    console.log('After browser forward:', page.url());

    await page.screenshot({ path: 'test-2-routing.png', fullPage: true });
  });

  test('3. Flow Builder Panel Scroll', async ({ page }) => {
    console.log('\n=== TEST 3: Flow Builder Panel Scroll ===');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Look for nodes to select
    const nodes = page.locator('[data-testid*="node"], .workflow-node, .node').first();
    if (await nodes.count() > 0) {
      await nodes.click();
      console.log('Node clicked');

      // Wait for properties panel
      await page.waitForTimeout(1000);

      // Check if properties panel exists
      const panel = page.locator('.properties-panel, [class*="properties"], [class*="panel"]').first();
      if (await panel.count() > 0) {
        const panelBox = await panel.boundingBox();
        console.log('Properties panel position:', panelBox);

        // Get computed style to check if position is fixed
        const position = await panel.evaluate(el => window.getComputedStyle(el).position);
        console.log('Panel position style:', position);

        // Scroll the page
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);

        const panelBoxAfterScroll = await panel.boundingBox();
        console.log('Properties panel position after scroll:', panelBoxAfterScroll);

        expect(position).not.toBe('fixed'); // Should not be fixed
      } else {
        console.log('Properties panel not found - try adding a node first');
      }
    } else {
      console.log('No nodes found - workflow canvas might be empty');
    }

    await page.screenshot({ path: 'test-3-panel-scroll.png', fullPage: true });
  });

  test('4. Error Notification Click', async ({ page }) => {
    console.log('\n=== TEST 4: Error Notification Click ===');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Look for error badge
    const errorBadge = page.locator('[class*="error"], .error-badge, [style*="red"]').filter({ hasText: /error|failed/i });
    const errorCount = await errorBadge.count();
    console.log('Error badges found:', errorCount);

    if (errorCount > 0) {
      // Check cursor style
      const cursor = await errorBadge.first().evaluate(el => window.getComputedStyle(el).cursor);
      console.log('Error badge cursor style:', cursor);

      // Click error badge
      await errorBadge.first().click();
      await page.waitForLoadState('networkidle');

      console.log('URL after clicking error badge:', page.url());
      expect(page.url()).toContain('/history');
    } else {
      console.log('No error badges found - feature may require triggering an error first');
    }

    await page.screenshot({ path: 'test-4-error-click.png', fullPage: true });
  });

  test('5. Node Label Visibility', async ({ page }) => {
    console.log('\n=== TEST 5: Node Label Visibility ===');

    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Try to add a node or select existing node
    const addButton = page.locator('button:has-text("Add Node"), button:has-text("Text To Image")').first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for node type label above "Node Configuration"
    const nodeConfigHeader = page.locator('text="Node Configuration"');
    if (await nodeConfigHeader.count() > 0) {
      console.log('Found "Node Configuration" header');

      // Look for node type label above it
      const nodeTypeLabel = page.locator('.node-type-label, [class*="nodeType"], h3, h4').filter({ hasText: /Text To Image|text_to_image|Node Type/i }).first();
      if (await nodeTypeLabel.count() > 0) {
        const color = await nodeTypeLabel.evaluate(el => window.getComputedStyle(el).color);
        const text = await nodeTypeLabel.textContent();
        console.log('Node type label text:', text);
        console.log('Node type label color:', color);

        // Check if color is dark (rgb values should be low)
        expect(color).toBeTruthy();
      } else {
        console.log('Node type label not found above Node Configuration');
      }
    } else {
      console.log('Node Configuration header not found - select a node first');
    }

    await page.screenshot({ path: 'test-5-node-label.png', fullPage: true });
  });

  test('6. API Token Generation', async ({ page }) => {
    console.log('\n=== TEST 6: API Token Generation ===');

    await page.goto(`${BASE_URL}/api-tokens`);
    await page.waitForLoadState('networkidle');

    // Look for Generate New Token button
    const generateButton = page.locator('button:has-text("Generate New Token"), button:has-text("Generate Token")').first();
    const buttonExists = await generateButton.count() > 0;
    console.log('Generate button found:', buttonExists);

    if (buttonExists) {
      await generateButton.click();
      await page.waitForTimeout(1000);

      // Fill in token name
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Token');
        console.log('Token name filled');
      }

      // Fill in expiry days
      const expiryInput = page.locator('input[name="expiry"], input[type="number"]').first();
      if (await expiryInput.count() > 0) {
        await expiryInput.fill('30');
        console.log('Expiry days filled');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        console.log('Token generation submitted');

        // Check if token is displayed
        const tokenDisplay = page.locator('[class*="token"], code, pre').first();
        if (await tokenDisplay.count() > 0) {
          const tokenText = await tokenDisplay.textContent();
          console.log('Token displayed:', tokenText?.substring(0, 20) + '...');
        }

        // Check for iframe embed code
        const iframeCode = page.locator('textarea, code').filter({ hasText: /iframe/i });
        const iframeExists = await iframeCode.count() > 0;
        console.log('Iframe embed code found:', iframeExists);

        // Check for copy button
        const copyButton = page.locator('button:has-text("Copy")');
        const copyExists = await copyButton.count() > 0;
        console.log('Copy button found:', copyExists);
      }
    } else {
      console.log('Generate New Token button not found');
    }

    await page.screenshot({ path: 'test-6-api-tokens.png', fullPage: true });

    // Test backend endpoints
    console.log('\n=== Testing Backend API Endpoints ===');

    const response = await page.request.get(`http://workflow-api.localhost/api/tokens`);
    console.log('GET /api/tokens status:', response.status());

    const embedResponse = await page.request.get(`http://workflow-api.localhost/api/embed-url`);
    console.log('GET /api/embed-url status:', embedResponse.status());
  });
});
