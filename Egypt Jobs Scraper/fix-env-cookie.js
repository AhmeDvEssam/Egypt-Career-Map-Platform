const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

const envBypass = `
    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        const start = pageNumber * 10;
        let url = \`https://eg.indeed.com/jobs?q=\${encodeURIComponent(this.currentKeyword)}&l=\${encodeURIComponent(this.currentLocation)}&start=\${start}\`;

        let html = '';
        require('dotenv').config();
        
        if (process.env.MANUAL_COOKIE) {
            console.log(\`[Indeed] 🍪 Using Manual Cookie from .env to bypass Playwright entirely for Search Page!\`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': process.env.MANUAL_USER_AGENT || this.userAgent,
                    'Cookie': process.env.MANUAL_COOKIE,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }
            });
            html = await response.text();
            
            // Override fetchJobDetailHtml to also just use the manual cookie without stealthContext
            this.fetchJobDetailHtml = async (detailUrl: string) => {
                const res = await fetch(detailUrl, {
                    headers: {
                        'User-Agent': process.env.MANUAL_USER_AGENT || this.userAgent,
                        'Cookie': process.env.MANUAL_COOKIE,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                    }
                });
                return await res.text();
            };
        } else {
            html = await this.fetchHtml(url);
        }
`;

code = code.replace(/public async scrapeSpecificPage.*?\n.*?const start = pageNumber \* 10;\n.*?\n.*?let html = await this\.fetchHtml\(url\);/s, envBypass.trim());

fs.writeFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', code);
