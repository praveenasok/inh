const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('file:///Users/praveenasok/Desktop/inhsuite/qr-manager.html', { waitUntil: 'networkidle2' });
    
    console.log("Page loaded. Testing Pickr initialization...");
    const isPickrFgDefined = await page.evaluate(() => typeof pickrFg !== 'undefined');
    console.log("pickrFg defined?", isPickrFgDefined);
    
    await browser.close();
})();
