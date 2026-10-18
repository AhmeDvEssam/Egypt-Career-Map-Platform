import { IScraper, JobEntity, ScrapeOptions } from './ScraperInterface';
import { Browser, Page } from 'playwright';
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
import * as cheerio from 'cheerio';
import axios from 'axios';
import { randomDelay, getRandomUserAgent } from './utils';

export abstract class BaseScraper implements IScraper {
    abstract name: string;
    abstract baseUrl: string;
    defaultPageSize = 15; // Wuzzuf default
    protected userAgent: string;

    constructor() {
        this.userAgent = getRandomUserAgent();
    }

    async scrape(options?: ScrapeOptions): Promise<JobEntity[]> {
        console.log(`[${this.name}] Starting scrape job...`);
        try {
            const results = await this.scrapeJobs(options);
            console.log(`[${this.name}] Scrape complete. Found ${results.length} jobs.`);
            return results;
        } catch (error) {
            console.error(`[${this.name}] Error during scrape:`, error);
            throw error;
        }
    }

    protected abstract scrapeJobs(options?: ScrapeOptions): Promise<JobEntity[]>;

    // Standardized methods for Smart Management
    public abstract fetchTotalJobs(): Promise<number>;
    public abstract scrapeSpecificPage(page: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }>;
    public abstract isJobClosed(url: string): Promise<boolean>;

    protected browserInstance: any = null; // using any to avoid import issues, strict type would be Browser
    protected contextPool: any[] = []; // Pool of No-JS contexts
    protected poolSize = 5; // Reduced to match batch size and avoid rate limiting
    protected poolIndex = 0;

    protected cookies: string = '';

    private async getNoJsContext(): Promise<any> {
        if (this.contextPool.length < this.poolSize) {
            // Fill pool if empty
            for (let i = this.contextPool.length; i < this.poolSize; i++) {
                const ctx = await this.browserInstance.newContext({ javaScriptEnabled: false });
                this.contextPool.push(ctx);
            }
        }
        // Round Robin Selection
        const ctx = this.contextPool[this.poolIndex];
        this.poolIndex = (this.poolIndex + 1) % this.poolSize;
        return ctx;
    }

    // Utility to fetch static HTML using Playwright (Persistent Session for Speed)
    protected async fetchHtml(url: string, options: { enableJs?: boolean } = { enableJs: true }): Promise<string> {
        console.log(`[BaseScraper] Fetching ${url.slice(-20)} | JS: ${options.enableJs}`);

        // Lazy Launch
        if (!this.browserInstance) {
            console.log('[BaseScraper] dYs? Launching Browser (Persistent)...');
            this.browserInstance = await chromium.launch({ 
                headless: false,
                args: ['--disable-blink-features=AutomationControlled']
            });
        }

        // OPTIMIZATION: Use API Request if JS is disabled (Super Fast)
        if (options.enableJs === false) {
            const context = await this.getNoJsContext();
            const maxRetries = 3;
            let lastError: any = null;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    const start = Date.now();
                    const response = await context.request.get(url, {
                        headers: {
                            'User-Agent': this.userAgent,
                            'Referer': 'https://wuzzuf.net/search/jobs/'
                        },
                        timeout: 20000
                    });
                    const duration = Date.now() - start;
                    console.log(`   [API] ${duration}ms | Status: ${response.status()} | Content-Length: ${response.headers()['content-length'] || 'unknown'} | URL: ${url.split('/').pop()?.slice(0, 15)}...`);

                    if (duration > 2000) console.log(`   ⚠️ SLOW REQUEST detected!`);

                    // Handle rate limiting with retry
                    if (response.status() === 429) {
                        const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000); // 5s, 10s, 20s (max 30s)
                        console.warn(`   ⚠️ Rate Limited (429)! Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue; // Retry
                    }

                    // Handle server errors (502/503) with retry
                    if (response.status() === 502 || response.status() === 503) {
                        const waitTime = 3000 * (attempt + 1); // 3s, 6s, 9s
                        console.warn(`   ⚠️ Server Error (${response.status()})! Waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
                        await new Promise(r => setTimeout(r, waitTime));
                        continue; // Retry
                    }

                    if (!response.ok()) {
                        console.warn(`[BaseScraper] API Fetch Failed: ${response.status()} ${response.statusText()}`);
                    }
                    return await response.text();
                } catch (e: any) {
                    lastError = e;
                    // Check if context was disposed - don't retry in that case
                    if (e.message?.includes('disposed') || e.message?.includes('closed')) {
                        console.error(`[BaseScraper] Context disposed for ${url}, cannot retry.`);
                        throw e;
                    }
                    // Retry on network errors
                    if (attempt < maxRetries - 1) {
                        const waitTime = 2000 * Math.pow(2, attempt);
                        console.warn(`[BaseScraper] Request failed, retrying in ${waitTime / 1000}s...`);
                        await new Promise(r => setTimeout(r, waitTime));
                    } else {
                        console.error(`[BaseScraper] API Request Error for ${url} after ${maxRetries} attempts`, e);
                        throw e;
                    }
                }
            }
            // Should not reach here, but just in case
            throw lastError || new Error('Max retries reached');
        }

        // Standard JS-Enabled Page Verification (Slow but necessary for Search Page)
        const page = await this.browserInstance.newPage();

        // OPTIMIZATION: Block heavy resources
        await page.route('**/*', (route: any) => {
            const type = route.request().resourceType();
            // Block everything except document and xhr (if using JS)
            if (['image', 'stylesheet', 'font', 'media', 'other', 'script'].includes(type)) {
                // Even with JS disabled, some resources might be requested, block them.
                // Note: Blocking 'script' helps even if enableJs=true but we don't need external scripts.
                return route.abort();
            }
            return route.continue();
        });

        try {
            await page.setExtraHTTPHeaders({
                'User-Agent': this.userAgent // Consistent UA
            });

            // If JS is disabled, domcontentloaded is basically 'done'.
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for content (Fast Fail) - Only if JS is enabled do we need to wait for selectors
            if (options.enableJs) {
                try {
                    await page.waitForSelector('.css-1gatmva, .e1v1l3u10', { timeout: 8000 });
                } catch (e) { }
            }

            // CAPTURE COOKIES for Axios (only if main persistent context)
            if (options.enableJs) {
                const cookies = await page.context().cookies();
                this.cookies = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
            }

            return await page.content();
        } catch (error) {
            console.error(`[BaseScraper] Browser Error for ${url}:`, error);
            throw error;
        } finally {
            await page.close();
            // Do NOT close context here as it is persistent
        }
    }

    // New: Cleanup method
    public async closeBrowser() {
        if (this.contextPool.length > 0) {
            await Promise.all(this.contextPool.map(c => c.close()));
            this.contextPool = [];
            this.poolIndex = 0;
        }
        if (this.browserInstance) {
            await this.browserInstance.close();
            this.browserInstance = null;
        }
    }

    // Utility to use Playwright for dynamic content
    protected async withBrowser<T>(fn: (page: Page) => Promise<T>, headless = true): Promise<T> {
        // Reuse existing browser if available and headless matches
        let browser = this.browserInstance;
        let localLaunch = false;

        if (!browser) {
            browser = await chromium.launch({ headless });
            localLaunch = true;
        }

        const page = await browser.newPage();
        try {
            await page.setExtraHTTPHeaders({
                'User-Agent': getRandomUserAgent()
            });
            return await fn(page);
        } finally {
            await page.close();
            if (localLaunch) await browser.close();
        }
    }

    // Fast HTTP Fetch (Axios) for Detail Pages
    protected async fetchStaticHtml(url: string): Promise<string> {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Cookie': this.cookies, // INJECT COOKIES
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                },
                timeout: 10000,
                validateStatus: (status) => status < 500
            });
            return response.data;
        } catch (error) {
            console.error(`[BaseScraper] Axios Error for ${url}:`, error);
            // Fallback to Playwright if Axios fails (e.g. 403)
            return this.fetchHtml(url);
        }
    }

    protected parseCurrency(text: string): 'EGP' | 'USD' | null {
        if (/EGP|L\.E|Pound/i.test(text)) return 'EGP';
        if (/USD|Dollar|\$/i.test(text)) return 'USD';
        return null;
    }



    public getHeaders(): string[] {
        return [
            'Job Id', 'Scraping Date', 'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type',
            'Experience Needed', 'Career Level', 'Education Level', 'Salary',
            'Job Categories', 'Skills', 'Posted Time', 'Job URL', 'Company URL', 'Logo',
              'Description', 'Requirements',
              'Job Status', 'Applicants', 'Open Positions', 'Viewed', 'In Consideration', 'Not Selected', 'Internal Category'
          ];
    }
}
