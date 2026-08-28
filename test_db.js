const fs = require('fs');

// We don't have localStorage in node. Let's write a small puppeteer script
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/delegated-orders.html');
  const data = await page.evaluate(() => {
    return localStorage.getItem('hairRatioDB');
  });
  fs.writeFileSync('db_dump.json', data || '{}');
  await browser.close();
})();
