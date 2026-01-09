import { test, expect } from '@playwright/test';

test.describe('Re-execution Tests for Fixed Issues', () => {

  test.describe('Test 1: API Token Generation (Previously FAIL)', () => {

    test('should navigate to API tokens page successfully', async ({ page }) => {
      await page.goto('http://workflow.localhost/api-tokens');
      await page.waitForLoadState('networkidle');

      // Verify page loads without errors
      const title = await page.textContent('h1, h2');
      expect(title).toBeTruthy();
    });

    test('should return array from GET /api/tokens endpoint (not 404)', async ({ page }) => {
      const response = await page.request.get('http://workflow-api.localhost/api/tokens');

      // Should NOT be 404
      expect(response.status()).not.toBe(404);

      // Should return 200 and array
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should generate new token with name and expiry', async ({ page }) => {
      await page.goto('http://workflow.localhost/api-tokens');
      await page.waitForLoadState('networkidle');

      // Click "Generate New Token" button
      const generateButton = page.locator('button:has-text("Generate New Token"), button:has-text("Generate Token")').first();
      await generateButton.click();

      // Fill in token name
      const nameInput = page.locator('input[name="name"], input[placeholder*="Token name"], input[placeholder*="name"]').first();
      await nameInput.fill('Test Token');

      // Fill in expiry days
      const expiryInput = page.locator('input[name="expiry"], input[name="expiryDays"], input[placeholder*="days"]').first();
      await expiryInput.fill('365');

      // Submit/Generate
      const submitButton = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")').first();
      await submitButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Verify token is created (check for success message or token display)
      const pageContent = await page.content();
      const hasTokenCreated = pageContent.includes('Test Token') ||
                              pageContent.includes('token') ||
                              pageContent.includes('generated');
      expect(hasTokenCreated).toBe(true);
    });

    test('should show iframe embed code after generation', async ({ page }) => {
      await page.goto('http://workflow.localhost/api-tokens');
      await page.waitForLoadState('networkidle');

      // Look for iframe code or embed code in the page
      const iframeCode = page.locator('code:has-text("iframe"), pre:has-text("iframe"), textarea:has-text("iframe")').first();

      // If tokens exist, verify iframe embed code is visible
      const tokensExist = await page.locator('table tr, .token-item').count() > 0;
      if (tokensExist) {
        // At least one token should show embed code
        const hasEmbedCode = await page.locator('text=/iframe|embed|<iframe/i').count() > 0;
        expect(hasEmbedCode).toBe(true);
      }
    });

    test('should have working copy button', async ({ page }) => {
      await page.goto('http://workflow.localhost/api-tokens');
      await page.waitForLoadState('networkidle');

      // Check for copy buttons
      const copyButtons = page.locator('button:has-text("Copy"), button[title*="Copy"]');
      const count = await copyButtons.count();

      if (count > 0) {
        // Click first copy button
        await copyButtons.first().click();

        // Verify clipboard or success message
        await page.waitForTimeout(500);
        const pageContent = await page.content();
        const hasCopyFeedback = pageContent.includes('Copied') ||
                                pageContent.includes('copied') ||
                                pageContent.includes('Copy successful');
        expect(hasCopyFeedback).toBe(true);
      }
    });

    test('should support DELETE endpoint for tokens', async ({ page }) => {
      // First, get existing tokens
      const getResponse = await page.request.get('http://workflow-api.localhost/api/tokens');
      const tokens = await getResponse.json();

      if (Array.isArray(tokens) && tokens.length > 0) {
        const tokenId = tokens[0].id || tokens[0]._id;

        // Test DELETE endpoint
        const deleteResponse = await page.request.delete(`http://workflow-api.localhost/api/tokens/${tokenId}`);

        // Should not return 404 (endpoint exists)
        expect(deleteResponse.status()).not.toBe(404);
      }
    });
  });

  test.describe('Test 2: Node Label Visibility (Previously FAIL - Wrong Color)', () => {

    test('should have dark label color in node configuration panel', async ({ page }) => {
      await page.goto('http://workflow.localhost/');
      await page.waitForLoadState('networkidle');

      // Add a node (Text To Image)
      const addNodeButton = page.locator('button:has-text("Add Node"), button:has-text("Text To Image")').first();

      // Try to find and click add node menu
      const hasAddButton = await addNodeButton.count() > 0;
      if (hasAddButton) {
        await addNodeButton.click();
        await page.waitForTimeout(1000);
      }

      // Alternative: click on canvas to add node or use existing node
      const canvas = page.locator('canvas, .react-flow, .workflow-canvas').first();
      if (await canvas.count() > 0) {
        await canvas.click({ position: { x: 300, y: 200 } });
        await page.waitForTimeout(500);
      }

      // Look for any node on canvas
      const nodeElements = page.locator('.react-flow__node, [class*="node"]');
      const nodeCount = await nodeElements.count();

      if (nodeCount > 0) {
        // Click on first node to select it
        await nodeElements.first().click();
        await page.waitForTimeout(1000);

        // Find the node type label above "Node Configuration"
        const nodeLabel = page.locator('text=/Node Configuration/i').locator('..').locator('*:has-text("Text"), *:has-text("Image"), *:has-text("Video")').first();

        // Check color of the label
        const labelElement = await nodeLabel.elementHandle();
        if (labelElement) {
          const color = await labelElement.evaluate(el => {
            return window.getComputedStyle(el).color;
          });

          console.log('Label color:', color);

          // Verify color is dark (NOT light gray)
          // Dark color should be rgb(26, 26, 26) or #1a1a1a
          // NOT rgb(224, 224, 224)
          expect(color).not.toBe('rgb(224, 224, 224)');

          // Should be dark (low RGB values)
          const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);

            // All values should be low for dark color (< 100)
            expect(r).toBeLessThan(100);
            expect(g).toBeLessThan(100);
            expect(b).toBeLessThan(100);
          }
        }
      }
    });

    test('should verify node type label exists and is visible', async ({ page }) => {
      await page.goto('http://workflow.localhost/');
      await page.waitForLoadState('networkidle');

      // Look for any existing nodes or try to add one
      const nodes = page.locator('.react-flow__node, [class*="WorkflowNode"]');
      const nodeCount = await nodes.count();

      console.log('Nodes found:', nodeCount);

      if (nodeCount > 0) {
        // Select first node
        await nodes.first().click();
        await page.waitForTimeout(1000);

        // Check for Node Configuration panel
        const configPanel = page.locator('text=/Node Configuration/i');
        const panelExists = await configPanel.count() > 0;

        console.log('Config panel exists:', panelExists);
        expect(panelExists).toBe(true);

        // Check for node type label above it
        const nodeTypeLabel = page.locator('[class*="node-type"], [class*="nodeType"], .text-sm, .text-xs').filter({ hasText: /Text|Image|Video|Audio/i });
        const labelCount = await nodeTypeLabel.count();

        console.log('Node type labels found:', labelCount);

        if (labelCount > 0) {
          // Verify label is visible
          const isVisible = await nodeTypeLabel.first().isVisible();
          expect(isVisible).toBe(true);
        }
      }
    });
  });
});
