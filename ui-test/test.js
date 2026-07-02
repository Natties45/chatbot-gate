const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching system Google Chrome...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // 1. Go to login page
    console.log("Navigating to login page...");
    await page.goto('http://203.154.16.162/app2/login', { waitUntil: 'networkidle0' });

    // 2. Login as NOC user
    console.log("Logging in as NOC user...");
    await page.type('#username', 'noc_user');
    await page.type('#password', 'NocPassword123!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    console.log("Logged in as NOC. URL:", page.url());

    // Send a message as NOC
    console.log("Testing NOC chat flow...");
    await page.goto('http://203.154.16.162/app2/noc', { waitUntil: 'networkidle0' });
    const nocChatResult = await page.evaluate(async () => {
      try {
        // Init session
        const initRes = await fetch('/app2/api/chat/noc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        });
        const initData = await initRes.json();
        if (!initData.sessionId) {
          return { error: 'Failed to init session', data: initData };
        }
        
        // Send message
        const msgRes = await fetch('/app2/api/chat/noc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'message', 
            sessionId: initData.sessionId, 
            message: 'ลูกค้าแจ้งว่าเน็ตบ้านใช้งานไม่ได้ ไฟสีแดงกระพริบที่เร้าเตอร์',
            promptType: 'chat'
          })
        });
        const msgData = await msgRes.json();
        return { status: msgRes.status, data: msgData };
      } catch (err) {
        return { error: err.message };
      }
    });
    console.log("NOC chat test result:", JSON.stringify(nocChatResult, null, 2));

    // Logout
    await page.evaluate(async () => {
      await fetch('/app2/api/auth/logout', { method: 'POST' });
    });
    await page.goto('http://203.154.16.162/app2/login', { waitUntil: 'networkidle0' });

    // 7. Login as Operation user
    console.log("Logging in as Operation user...");
    await page.type('#username', 'op_user');
    await page.type('#password', 'OpPassword123!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    console.log("Logged in as Operation. URL:", page.url());

    console.log("Testing Operation chat flow...");
    await page.goto('http://203.154.16.162/app2/operation', { waitUntil: 'networkidle0' });
    const opChatResult = await page.evaluate(async () => {
      try {
        // Init session
        const initRes = await fetch('/app2/api/chat/operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'init' })
        });
        const initData = await initRes.json();
        if (!initData.sessionId) {
          return { error: 'Failed to init session', data: initData };
        }

        // Send message
        const msgRes = await fetch('/app2/api/chat/operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'message', 
            sessionId: initData.sessionId, 
            message: 'check docker status',
            promptType: 'message'
          })
        });
        const msgData = await msgRes.json();
        return { status: msgRes.status, data: msgData };
      } catch (err) {
        return { error: err.message };
      }
    });
    console.log("Operation chat test result:", JSON.stringify(opChatResult, null, 2));

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
