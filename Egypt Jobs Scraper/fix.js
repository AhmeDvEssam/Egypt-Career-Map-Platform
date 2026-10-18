const fs = require('fs');
let code = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

code = code.replace(/import \{ Browser, BrowserContext \} from 'playwright';/, '');
code = code.replace(/import \{ chromium \} from 'playwright-extra';/, '');
code = code.replace(/const stealth = require\('puppeteer-extra-plugin-stealth'\)\(\);/, '');
code = code.replace(/chromium\.use\(stealth\);/, '');

code = code.replace(/private stealthBrowser: Browser \| null = null;/, '');
code = code.replace(/private stealthContext: BrowserContext \| null = null;/, '');
code = code.replace(/IndeedBrowserScraper/g, 'IndeedCrawlbaseScraper');

code = code.replace(/private async initBrowser\(\) \{[\s\S]*?\n    \}/, '');

code = code.replace(/protected async fetchHtml\(url: string, options: \{ enableJs\?: boolean, preflightUrl\?: string \} = \{ enableJs: true \}\): Promise<string> \{[\s\S]*?\n    \}/, `protected async fetchHtml(url: string, options: { enableJs?: boolean, preflightUrl?: string } = { enableJs: true }): Promise<string> {
        console.log(\`[Indeed] 🌐 Fetching via Crawlbase API: \${url}\`);
        const token = "zchbR4p9Ki7dhecKnszAhg";
        const crawlbaseUrl = \`https://api.crawlbase.com/?token=\${token}&url=\${encodeURIComponent(url)}\`;
        
        try {
            const response = await fetch(crawlbaseUrl);
            if (!response.ok) {
                throw new Error(\`Crawlbase returned \${response.status}: \${await response.text()}\`);
            }
            return await response.text();
        } catch (e: any) {
            console.error(\`[Crawlbase Error]: \${e.message}\`);
            throw e;
        }
    }`);

code = code.replace(/public async closeBrowser\(\) \{[\s\S]*?\n    \}/, `public async closeBrowser() {
        await super.closeBrowser();
    }`);

fs.writeFileSync('src/scrapers/indeed/IndeedCrawlbaseScraper.ts', code);
