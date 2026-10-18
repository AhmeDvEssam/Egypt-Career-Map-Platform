import { BaseScraper } from '../../core/BaseScraper';
import { normalizeUrl } from '../../utils/normalize';
import { IndeedJobDetailParser } from './IndeedJobDetailParser';
import { JobEntity, PartialJob } from '../../core/ScraperInterface';
import * as cheerio from 'cheerio';
import { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright-extra';

const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

export class IndeedBrowserScraper extends BaseScraper {
    name = 'Indeed';
    baseUrl = 'https://eg.indeed.com';
    defaultPageSize = 15;

    public currentKeyword: string = 'developer';
    public currentLocation: string = 'Egypt';

    private stealthBrowser: Browser | null = null;
    private stealthContext: BrowserContext | null = null;

    // Anti-Bot Jitter State
    private nextSpikeJobCount: number = Math.floor(Math.random() * (70 - 10 + 1)) + 10;
    private jobsProcessedSinceSpike: number = 0;
    private timeDebtMs: number = 0;
    private paginationUrls: Map<number, string> = new Map();

    constructor() {
        super();
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    public async fetchTotalJobs(): Promise<number> {
        return 900;
    }

    public async scrapeJobs(): Promise<JobEntity[]> {
        return [];
    }

    public async isJobClosed(url: string): Promise<boolean> {
        return false;
    }

    private async initBrowser() {
        if (!this.stealthContext) {
            const userDataDir = require('path').join(__dirname, '../../../browser_session');
            
            // Fallback to default Playwright browser if Chrome is not found
            let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            if (!require('fs').existsSync(executablePath)) {
                executablePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
            }

            try {
                this.stealthContext = await chromium.launchPersistentContext(userDataDir, {
                    headless: false,
                    executablePath: require('fs').existsSync(executablePath) ? executablePath : undefined,
                    viewport: { width: 1280, height: 800 },
                    userAgent: this.userAgent,
                    args: [
                        '--disable-blink-features=AutomationControlled',
                        '--no-sandbox',
                        '--disable-infobars',
                        '--window-size=1280,800'
                    ]
                });
            } catch (e) {
                console.error('Failed to launch persistent context:', e);
                // Fallback to normal if persistent fails
                this.stealthBrowser = await chromium.launch({ headless: false });
                this.stealthContext = await this.stealthBrowser.newContext({
                    userAgent: this.userAgent,
                    viewport: { width: 1280, height: 800 }
                });
            }
        }
    }

    public async checkIsLoggedIn(): Promise<boolean> {
        try {
            await this.initBrowser();
            const page = await this.stealthContext!.newPage();
            try {
                await page.goto('https://eg.indeed.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
                await page.waitForTimeout(1000);
                const content = await page.content();
                const loggedIn = content.includes('Sign Out') || 
                                 content.includes('gnav-AccountMenu') || 
                                 content.includes('data-gnav-element-name="AccountMenu"') ||
                                 content.includes('account/manage');
                return loggedIn;
            } finally {
                await page.close().catch(() => {});
            }
        } catch (e) {
            return false;
        }
    }

    private getJitteredDelay(baseMs: number, maxVariance: number): number {
        const irrationalFactor = (Math.PI * Math.E * Math.random()) % 1;
        const variance = maxVariance * (Math.random() > 0.5 ? 1 : -1) * irrationalFactor;
        return Math.max(100, baseMs + variance);
    }

    protected async fetchHtml(url: string, options: { enableJs?: boolean, preflightUrl?: string } = { enableJs: true }): Promise<string> {
        await this.initBrowser();
        const page = await this.stealthContext!.newPage();
        try {
            await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'media'].includes(resourceType)) {
                    return route.abort();
                }
                return route.continue();
            });

            if (options.preflightUrl) {
                console.log(`[Indeed] ✈️ Navigating to preflight URL to establish session trust...`);
                await page.goto(options.preflightUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                try {
                    await page.waitForSelector('.job_seen_beacon', { timeout: 10000 });
                } catch (e) {
                    console.log('[Indeed] Preflight selector wait timeout, continuing...');
                }
                
                // Human-like mouse movement
                await page.mouse.move(Math.random() * 800, Math.random() * 600, { steps: 10 });
                await page.waitForTimeout(this.getJitteredDelay(2000, 1000));
            }
            
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait for JS challenge to resolve if present, while moving mouse
            try {
                for (let i = 0; i < 5; i++) {
                    await page.mouse.move(100 + Math.random() * 800, 100 + Math.random() * 600, { steps: 5 });
                    await page.waitForTimeout(this.getJitteredDelay(500, 200));
                    const beacon = await page.$('.job_seen_beacon');
                    if (beacon) break;
                }
                await page.waitForSelector('.job_seen_beacon', { timeout: 15000 });
            } catch (e) {
                console.log('[Indeed] Main page selector wait timeout (might be blocked or empty)');
            }
            
            return await page.content();
        } finally {
            await page.close();
        }
    }

    
    protected async fetchJobDetailHtml(url: string): Promise<string> {
        console.log(`[Indeed] 🕵️ Browser Stealth Fetch: ${url}`);
        // We must use a real browser page instead of Node.js fetch, because Cloudflare Turnstile blocks Node.js TLS fingerprints with a 401/403.
        return await this.fetchHtml(url);
    }

    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        const start = pageNumber * 10;
        let url = `https://eg.indeed.com/jobs?q=${encodeURIComponent(this.currentKeyword)}&l=${encodeURIComponent(this.currentLocation)}&start=${start}`;
        
        // If we have a cached pagination URL for this page (which contains the required 'pp' token), use it!
        if (pageNumber > 0 && this.paginationUrls.has(pageNumber)) {
            const cachedPath = this.paginationUrls.get(pageNumber);
            if (cachedPath) {
                url = 'https://eg.indeed.com' + cachedPath;
                console.log(`[Indeed] 🎫 Using authenticated pagination token for Page ${pageNumber}`);
            }
        }
        
        console.log(`[Indeed] Scraping Search Page ${pageNumber}: ${url}`);
        
        let html;
        try {
            html = await this.fetchHtml(url);
            if (html.includes('branding=page-two-signin') || html.includes('auth-page-social-sign-in')) {
                console.log(`[Indeed] 🔒 Indeed Sign-in Wall encountered for Page ${pageNumber + 1}. Sign-in is required to view page 2+.`);
                return { jobs: [], foundCards: 0 };
            }
        } catch (e: any) {
            console.error('[Indeed] Failed to fetch search page:', e.message);
            if (e.message && (e.message.includes('ERR_INTERNET_DISCONNECTED') || e.message.includes('Target closed'))) {
                console.log('[Indeed] ⚠️ Browser crashed or disconnected. Forcing session reset...');
                await this.closeBrowser();
            }
            return { jobs: [], foundCards: 0 };
        }

        const $ = cheerio.load(html);
        const partials: PartialJob[] = [];

        // Extract pagination links to bypass "page-two-signin"
        $('ul.css-1g90gv6 a[data-testid^="pagination-page-"]').each((_, el) => {
            const pageText = $(el).text();
            const href = $(el).attr('href');
            if (pageText && href) {
                const pageNum = parseInt(pageText, 10) - 1; // 0-indexed page number
                this.paginationUrls.set(pageNum, href);
            }
        });
        const nextButtonHref = $('a[data-testid="pagination-page-next"]').attr('href');
        if (nextButtonHref) {
            this.paginationUrls.set(pageNumber + 1, nextButtonHref);
        }

        let mosaicData = '';
        $('script').each((i, el) => {
            const text = $(el).text();
            if (text.includes('window.mosaic.providerData["mosaic-provider-jobcards"]=')) {
                mosaicData = text;
            }
        });

        const match = mosaicData.match(/window\.mosaic\.providerData\["mosaic-provider-jobcards"\]=(\{.+?\});/);
        
        let fallbackCards = 0;
        if (match) {
            try {
                const data = JSON.parse(match[1]);
                const results = data.metaData.mosaicProviderJobCardsModel.results || [];
                fallbackCards = results.length;
                for (const job of results) {
                    const title = job.title;
                    const company_name = job.company;
                    const source_job_id = job.jobkey;
                    const locationText = job.formattedLocation || '';
                    const rawLink = job.link;
                    const jobUrl = rawLink ? (rawLink.startsWith('http') ? rawLink : 'https://eg.indeed.com' + rawLink) : '';

                    const isTrap = /^[a-f0-9]{16}$/i.test(source_job_id) && new Set(source_job_id.toLowerCase()).size === 16;
                    
                    if (title && source_job_id && !isTrap) {
                        const salary = job.salarySnippet?.text || job.estimatedSalary?.formattedRange || job.extractedSalary?.formatted || null;
                        let job_type = null;
                        if (job.jobTypes && job.jobTypes.length > 0) {
                            job_type = job.jobTypes.join(', ');
                        }

                        partials.push({
                            source_job_id,
                            url: jobUrl,
                            title,
                            company_name,
                            location: locationText,
                            job_type,
                            salary,
                            scraped_at: new Date()
                        });
                    }
                }
            } catch (err) {
                console.error('[Indeed] JSON Parse error for mosaic data', err);
            }
        }
        
        // If JSON fails, fallback to Cheerio length for stats reporting
        if (partials.length === 0) {
            fallbackCards = $('.job_seen_beacon').length;
        }

        const finalJobs: JobEntity[] = [];
        for (const partial of partials) {
            // Deduplication skip
            const normUrl = normalizeUrl(partial.url) || partial.url;
            if (strictSkipUrls && strictSkipUrls.has(normUrl)) {
                console.log(`[Indeed] Skipping known job: ${partial.source_job_id}`);
                continue;
            }

            const jobEntity = await this.scrapeJobDetail(partial.source_job_id, partial);
            if (jobEntity) {
                finalJobs.push(jobEntity);
            }
            
            // Anti-bot Long-Term Jitter Logic (Spikes & Debt Repayment)
            this.jobsProcessedSinceSpike++;

            if (this.jobsProcessedSinceSpike >= this.nextSpikeJobCount) {
                // Trigger sudden spike (10s to 20s)
                const spikeMin = 10000;
                const spikeMax = 20000;
                const spikeTimeMs = Math.floor(Math.random() * (spikeMax - spikeMin + 1)) + spikeMin;
                
                console.log(`\n[Anti-Bot] ⚠️ SUDDEN HUMAN BREAK! Waiting ${(spikeTimeMs / 1000).toFixed(2)}s...`);
                await new Promise(r => setTimeout(r, spikeTimeMs));
                
                this.timeDebtMs += spikeTimeMs; // Register debt
                this.jobsProcessedSinceSpike = 0;
                this.nextSpikeJobCount = Math.floor(Math.random() * (70 - 10 + 1)) + 10; // Next spike in 10-70 jobs
            } else {
                // Normal delay calculation
                const minMs = 500;
                const maxMs = 5400;
                let finalDelay = this.getJitteredDelay(minMs, maxMs - minMs);

                // Compensation (Debt repayment) to keep long-term average fast
                if (this.timeDebtMs > 0) {
                    // Maximum deduction is up to 1 second per job
                    let maxDeduction = Math.min(this.timeDebtMs, 1000); 
                    
                    // But we never want the actual delay to drop below 200ms (0.2s) to avoid spamming
                    if (finalDelay - maxDeduction < 200) {
                        maxDeduction = finalDelay - 200; 
                    }

                    if (maxDeduction > 0) {
                        const deduction = Math.floor(Math.random() * (maxDeduction + 1));
                        finalDelay -= deduction;
                        this.timeDebtMs -= deduction;
                        console.log(`[Anti-Bot] Paid off debt: -${(deduction / 1000).toFixed(2)}s | Remaining Debt: ${(this.timeDebtMs / 1000).toFixed(2)}s`);
                    }
                }

                console.log(`[Anti-Bot] Decimal Jitter: Waiting ${(finalDelay / 1000).toFixed(2)}s...`);
                await new Promise(r => setTimeout(r, finalDelay));
            }
        }

        if (partials.length === 0 && fallbackCards === 0) {
            console.log('\n[Indeed] 🛡️ 0 Cards found! (Likely "Sign in" Wall or Cloudflare Block).');
            try {
                require('fs').writeFileSync('indeed_block_debug.html', html || '');
                console.log('[Indeed] 💾 HTML saved to indeed_block_debug.html for analysis!');
            } catch (e) {
                console.log('Could not save HTML', e);
            }
            console.log('[Indeed] Destroying browser session. The next retry will use a clean, stateless browser!');
            await this.closeBrowser();
        }

        return { jobs: finalJobs, foundCards: partials.length || fallbackCards };
    }

    public async scrapeJobDetail(jobId: string, partialJob: PartialJob): Promise<JobEntity | null> {
        console.log(`[Indeed] Scraping Full Page Detail for ${jobId}...`);
        let html;
        try {
            const url = `https://eg.indeed.com/viewjob?jk=${jobId}`;
            html = await this.fetchJobDetailHtml(url);
        } catch (e: any) {
            console.error(`[Indeed] Detail fetch failed for ${jobId}`, e.message);
            if (e.message && (e.message.includes('ERR_INTERNET_DISCONNECTED') || e.message.includes('Target closed'))) {
                console.log('[Indeed] ⚠️ Browser crashed or disconnected. Forcing session reset...');
                await this.closeBrowser();
            }
            return null;
        }

        const parsed = IndeedJobDetailParser.parse(html);

        if (!parsed.description) {
            console.log(`[Indeed] Empty description for ${jobId}, probably blocked or expired.`);
            return null;
        }

        let jobType = partialJob.job_type || parsed.jobType;
        if (jobType.toLowerCase().includes('egp') || jobType.toLowerCase().includes('month') || jobType.toLowerCase().includes('year')) {
            jobType = parsed.jobType;
        }

        return {
            source_job_id: jobId,
            url: partialJob.url,
            title: partialJob.title,
            company_name: partialJob.company_name,
            company_url: '',
            location: partialJob.location,
            posted_time: parsed.postedDate || new Date().toISOString(),
            job_type: jobType,
            work_type: parsed.workType || 'Not Specified',
            experience_needed: parsed.experience || 'Not Specified',
            career_level: parsed.careerLevel || 'Not Specified',
            education_level: 'Not Specified',
            salary: partialJob.salary || null,
            job_categories: null,
            skills: 'Not Specified',
            description: parsed.description,
            requirements: '',
            job_status: 'Open',
            open_positions: 1,
            viewed: 0,
            in_consideration: 0,
            not_selected: 0,
            scraped_at: partialJob.scraped_at
        };
    }

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
}