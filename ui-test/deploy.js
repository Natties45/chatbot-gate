const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching system Google Chrome for Git Sync...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log("Logging in as admin...");
    await page.goto('http://203.154.16.162/app2/login', { waitUntil: 'networkidle0' });
    await page.type('#username', 'admin');
    await page.type('#password', 'AdminGate2026!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    
    console.log("Triggering git pull_latest...");
    const syncResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/app2/api/admin/git-sync/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'pull_latest' })
        });
        const data = await res.json();
        return { status: res.status, data };
      } catch (err) {
        return { error: err.message };
      }
    });

    console.log("Git sync response:", syncResult);
    
    // Test the NOC API to see if the new boundary is active
    console.log("Testing NOC API to verify...");
    const testResult = await page.evaluate(async () => {
      try {
        const initRes = await fetch('/app2/api/chat/noc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        });
        const initData = await initRes.json();
        
        const msgRes = await fetch('/app2/api/chat/noc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'message', 
            sessionId: initData.sessionId, 
            message: 'ขอสูตรทำผัดกะเพราหมูสับหน่อยครับ',
            promptType: 'chat'
          })
        });
        return await msgRes.json();
      } catch (err) {
        return { error: err.message };
      }
    });
    
    console.log("Test Result:", testResult);

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
