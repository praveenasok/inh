const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://inhsuite.web.app/proforma-invoice.html', {waitUntil: 'networkidle0'});
    
    // Simulate typing shipping
    await page.type('#inp-shipping', '125');
    
    // Check invoiceShipping
    const invoiceShipping = await page.evaluate(() => window.invoiceShipping);
    console.log('invoiceShipping after typing:', invoiceShipping);
    
    await browser.close();
})();
