const fs = require('fs');
let code = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

// Fix fetchHtml to handle Cloudflare turnstile
const fetchHtmlNew = `
    protected async fetchHtml(url: string, options: { enableJs?: boolean, preflightUrl?: string } = { enableJs: true }): Promise<string> {
        await this.initBrowser();
        const page = await this.stealthContext!.newPage();
        try {
            if (options.preflightUrl) {
                console.log(\`[Indeed] ✈️ Navigating to preflight URL to establish session trust...\`);
                await page.goto(options.preflightUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                // Wait for Cloudflare/DataDome to solve
                try {
                    await page.waitForSelector('.job_seen_beacon', { timeout: 10000 });
                } catch (e) {
                    console.log('[Indeed] Preflight selector wait timeout, continuing...');
                }
                await new Promise(r => setTimeout(r, 2000));
            }
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait for JS challenge to resolve if present
            try {
                await page.waitForSelector('.job_seen_beacon', { timeout: 15000 });
            } catch (e) {
                console.log('[Indeed] Main page selector wait timeout (might be blocked or empty)');
            }
            
            return await page.content();
        } finally {
            await page.close();
        }
    }
`;

// replace the old fetchHtml
code = code.replace(/protected async fetchHtml[\s\S]*?\} finally \{[\s\S]*?await page\.close\(\);\n        \}\n    \}/, fetchHtmlNew.trim());

fs.writeFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', code);
