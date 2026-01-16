const { chromium } = require('playwright');

async function debug() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('Navigating to playground...');
  await page.goto('http://workflow.localhost/playground', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: '/Users/balpreetsingh/conductor/workspaces/amc-v1/west-monroe/playground-screenshot.png', fullPage: true });
  console.log('Screenshot saved to playground-screenshot.png');
  
  const html = await page.content();
  console.log('\n=== Page HTML (first 1000 chars) ===');
  console.log(html.substring(0, 1000));
  
  const selects = await page.locator('select').count();
  console.log('\n=== Select elements found: ' + selects);
  
  if (selects > 0) {
    const firstSelect = await page.locator('select').first();
    const className = await firstSelect.getAttribute('class');
    console.log('First select class: ' + className);
    
    const options = await firstSelect.locator('option').count();
    console.log('Options in first select: ' + options);
    
    if (options > 0) {
      for (let i = 0; i < Math.min(5, options); i++) {
        const opt = await firstSelect.locator('option').nth(i);
        const value = await opt.getAttribute('value');
        const text = await opt.textContent();
        console.log('  Option ' + i + ': value=' + value + ', text=' + text);
      }
    }
  }
  
  await page.waitForTimeout(3000);
  await browser.close();
}

debug().catch(console.error);
