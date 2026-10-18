const fs = require('fs');
let code = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

// Replace scrapeJobDetail fetchHtml call with a new fetchJobDetailHtml
code = code.replace(/html = await this\.fetchHtml\(url\);/, 'html = await this.fetchJobDetailHtml(url);');

// Add fetchJobDetailHtml method
const customFetch = `
    protected async fetchJobDetailHtml(url: string): Promise<string> {
        if (!this.stealthContext) {
            return await this.fetchHtml(url);
        }
        
        console.log(\`[Indeed] 🕵️ HTTP API Stealth Fetch: \${url}\`);
        const cookies = await this.stealthContext.cookies();
        const cookieString = cookies.map(c => \`\${c.name}=\${c.value}\`).join('; ');
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cookie': cookieString,
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        if (!response.ok) {
            throw new Error(\`HTTP Fetch failed with status \${response.status}\`);
        }
        return await response.text();
    }
`;

// Insert the method before scrapeSpecificPage
code = code.replace(/public async scrapeSpecificPage/, customFetch + '\n    public async scrapeSpecificPage');

fs.writeFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', code);
