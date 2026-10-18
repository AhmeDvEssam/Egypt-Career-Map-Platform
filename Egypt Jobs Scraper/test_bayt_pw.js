const { chromium } = require('playwright');
async function test() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    try {
        await page.goto('https://www.bayt.com/en/egypt/jobs/', { waitUntil: 'networkidle', timeout: 30000 });
        const html = await page.content();
        console.log('HTML Length:', html.length);
        const title = await page.title();
        console.log('Title:', title);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
}
test();
