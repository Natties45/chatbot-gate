const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching system Google Chrome...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1024']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  
  try {
    console.log("Logging in as admin...");
    await page.goto('http://203.154.16.162/app2/login', { waitUntil: 'networkidle0' });
    await page.type('#username', 'admin');
    await page.type('#password', 'AdminGate2026!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    
    console.log("Going to settings page...");
    await page.goto('http://203.154.16.162/app2/settings', { waitUntil: 'networkidle0' });
    
    await page.screenshot({ path: 'C:\\Users\\natti\\.gemini\\antigravity\\brain\\ad194bf4-7c03-4bf3-a335-fe06cc28425b\\settings-page.png' });
    console.log("Screenshot saved!");

  } catch (error) {
    console.error("Failed:", error);
  } finally {
    await browser.close();
  }
})();
