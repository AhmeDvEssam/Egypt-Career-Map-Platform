const fs = require('fs');
let code = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

// Replace initBrowser
const initBrowserNew = `
    private async initBrowser() {
        if (!this.stealthContext) {
            const userDataDir = require('path').join(__dirname, '../../../../indeed_profile');
            
            // Fallback to default Playwright browser if Chrome is not found
            let executablePath = 'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
            if (!require('fs').existsSync(executablePath)) {
                executablePath = 'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';
            }

            try {
                this.stealthContext = await chromium.launchPersistentContext(userDataDir, {
                    headless: false,
                    executablePath: require('fs').existsSync(executablePath) ? executablePath : undefined,
                    viewport: { width: 1920, height: 1080 },
                    userAgent: this.userAgent,
                    args: [
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-infobars',
                        '--window-size=1920,1080'
                    ]
                });
            } catch (e) {
                console.error('Failed to launch persistent context:', e);
                // Fallback to normal if persistent fails
                this.stealthBrowser = await chromium.launch({ headless: false });
                this.stealthContext = await this.stealthBrowser.newContext({
                    userAgent: this.userAgent,
                    viewport: { width: 1920, height: 1080 }
                });
            }
        }
    }
`;

code = code.replace(/private async initBrowser\(\) \{[\s\S]*?\}\n    \}/, initBrowserNew.trim());

// Replace closeBrowser
const closeBrowserNew = `
    public async closeBrowser() {
        if (this.stealthContext) {
            await this.stealthContext.close();
            this.stealthContext = null;
        }
        if (this.stealthBrowser) {
            await this.stealthBrowser.close();
            this.stealthBrowser = null;
        }
        await super.closeBrowser();
    }
`;

code = code.replace(/public async closeBrowser\(\) \{[\s\S]*?await super\.closeBrowser\(\);\n    \}/, closeBrowserNew.trim());

fs.writeFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', code);
