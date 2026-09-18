const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/order-list.html', { waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 10000));
  
  const pageInfo = await page.$eval('#pageInfo', el => el.textContent).catch(() => 'NOT FOUND');
  console.log('Page Info text after 10s:', pageInfo);
  
  await browser.close();
})();
