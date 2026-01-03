import { test } from '@playwright/test';

test.only('screenshot API tokens page', async ({ page }) => {
  await page.goto('http://workflow.localhost/api-tokens');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/Users/balpreetsingh/conductor/workspaces/amc-v1/vancouver/api-tokens-page.png', fullPage: true });

  // Click generate button to see modal
  const generateButton = page.locator('button:has-text("Generate"), button:has-text("New")');
  const count = await generateButton.count();
  console.log('Generate buttons found:', count);

  if (count > 0) {
    await generateButton.first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/balpreetsingh/conductor/workspaces/amc-v1/vancouver/api-tokens-modal.png', fullPage: true });
  }
});
