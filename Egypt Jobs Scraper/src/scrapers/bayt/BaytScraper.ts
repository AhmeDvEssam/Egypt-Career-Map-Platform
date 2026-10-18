import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, PartialJob, ScrapeOptions } from '../../core/ScraperInterface';
import * as cheerio from 'cheerio';
import { Page } from 'playwright';
import { GeminiRotationAgent } from '../../utils/GeminiRotationAgent';

interface BaytPartialJob extends PartialJob {
    posted_time?: string;
    logo_url?: string;
    description?: string;
    career_level?: string;
}

export class BaytScraper extends BaseScraper {
    name = 'Bayt';
    baseUrl = 'https://www.bayt.com';
    defaultPageSize = 20;
    private aiAgent = new GeminiRotationAgent();

    public lastKnownPage: number = 0; // Extracted from "Last" pagination button

    public async fetchTotalJobs(): Promise<number> {
        try {
            // Scrape page 1 to find the "Last" pagination button
            if (!this.browserInstance) {
                const { chromium } = require('playwright-extra');
                const stealth = require('puppeteer-extra-plugin-stealth')();
                chromium.use(stealth);
                this.browserInstance = await chromium.launch({ headless: true });
            }

            const html = await this.withBrowser(async (page: Page) => {
                await page.goto(`${this.baseUrl}/en/egypt/jobs/?page=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(1500);
                return await page.content();
            }, true);

            const $ = cheerio.load(html);
            
            // Look for the "Last" pagination link
            let lastPage = 0;
            $('a').each((i: number, el: any) => {
                const text = $(el).text().trim().toLowerCase();
                if (text === 'last') {
                    const href = $(el).attr('href') || '';
                    const match = href.match(/page=(\d+)/);
                    if (match) {
                        lastPage = parseInt(match[1]);
                    }
                }
            });

            // Fallback: look at all pagination numbers
            if (lastPage === 0) {
                $('a[href*="page="]').each((i: number, el: any) => {
                    const href = $(el).attr('href') || '';
                    const match = href.match(/page=(\d+)/);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > lastPage) lastPage = num;
                    }
                });
            }

            if (lastPage > 0) {
                this.lastKnownPage = lastPage;
                const total = lastPage * 30; // 30 jobs per page
                console.log(`[Bayt] Detected LAST page = ${lastPage} → Estimated ${total} total jobs`);
                return total;
            }

            console.warn('[Bayt] Could not detect Last page button. Using default 2500.');
            return 2500;
        } catch (e: any) {
            console.warn(`[Bayt] fetchTotalJobs failed: ${e.message}. Using default 2500.`);
            return 2500;
        }
    }

    public async isJobClosed(jobUrl: string): Promise<boolean> {
        return false; // Can implement later
    }

    public async scrapeJobs(options?: ScrapeOptions): Promise<JobEntity[]> {
        return []; // Global scan uses scrapeSpecificPage
    }

    // ─── Persistent Browser Fallback ────────────────────────────────────────────
    // Reuses the same browser_session folder as sync_status.ts (already has CF cookie)
    private persistentContext: any = null;
    private persistentLaunchPromise: Promise<any> | null = null;

    private async getPersistentContext(): Promise<any> {
        if (this.persistentContext) return this.persistentContext;
        if (this.persistentLaunchPromise) return this.persistentLaunchPromise;

        this.persistentLaunchPromise = (async () => {
            const path = require('path');
            const fs = require('fs');
            const { chromium: chromiumExtra } = require('playwright-extra');
            const stealth = require('puppeteer-extra-plugin-stealth')();
            chromiumExtra.use(stealth);

            const userDataDir = path.join(__dirname, '..', '..', 'browser_session');
            if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

            console.log('[Bayt] Opening persistent browser (reusing Status Updater session)...');
            this.persistentContext = await chromiumExtra.launchPersistentContext(userDataDir, {
                headless: false,
                args: ['--window-position=0,0', '--window-size=500,500']
            });
            return this.persistentContext;
        })();

        return this.persistentLaunchPromise;
    }

    private async fetchWithPersistentBrowser(url: string): Promise<string> {
        const context = await this.getPersistentContext();
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // Wait for Cloudflare to clear if it appears
            try {
                await page.waitForFunction(
                    () => !document.title.includes('Just a moment') && !document.title.includes('Cloudflare'),
                    { timeout: 20000 }
                );
            } catch(e) {}
            await page.waitForTimeout(1500);
            return await page.content();
        } finally {
            await page.close();
        }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // Track IDs from the previous page to detect Bayt's pagination wraparound
    private previousPageIds: Set<string> = new Set();

    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        // Initialize browser if not exist
        if (!this.browserInstance) {
            const { chromium } = require('playwright-extra');
            const stealth = require('puppeteer-extra-plugin-stealth')();
            chromium.use(stealth);
            this.browserInstance = await chromium.launch({ headless: true });
        }

        // Bayt pagination is 1-indexed. page 1 = first page.
        // If the system passes page 0, it means page 1.
        const actualPage = pageNumber + 1;

        // HARD STOP: If we know the last page from "Last" button, don't go beyond it
        if (this.lastKnownPage > 0 && actualPage > this.lastKnownPage) {
            console.log(`[Bayt] Page ${actualPage} exceeds last known page (${this.lastKnownPage}). Stopping.`);
            throw new Error('Loop Detected: Exceeded last known page from Bayt pagination');
        }

        const url = `${this.baseUrl}/en/egypt/jobs/?page=${actualPage}`;
        
        console.log(`[Bayt] Scraping Search Page ${actualPage}: ${url}`);

        let html = '';
        let usedFallback = false;
        try {
            // Try fast headless stealth browser first
            html = await this.withBrowser(async (page: Page) => {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await page.waitForTimeout(1000);
                return await page.content();
            }, true);
        } catch (e: any) {
            console.warn(`[Bayt] Headless failed for page ${actualPage}: ${e.message}. Trying persistent session...`);
            try {
                html = await this.fetchWithPersistentBrowser(url);
                usedFallback = true;
            } catch (e2: any) {
                console.error(`[Bayt] Both methods failed for page ${actualPage}: ${e2.message}`);
                return { jobs: [], foundCards: 0 };
            }
        }

        const $ = cheerio.load(html);
        
        const pageTitle = $('title').text();
        if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
            console.error(`[Bayt] Cloudflare blocked Search Page ${actualPage}! Trying persistent session...`);
            if (!usedFallback) {
                try {
                    html = await this.fetchWithPersistentBrowser(url);
                } catch (e: any) {
                    console.error(`[Bayt] Persistent session also failed: ${e.message}`);
                    if (this.browserInstance) {
                        await this.browserInstance.close();
                        this.browserInstance = null;
                    }
                    throw new Error('Cloudflare Block - Both methods failed');
                }
            } else {
                if (this.browserInstance) {
                    await this.browserInstance.close();
                    this.browserInstance = null;
                }
                throw new Error('Cloudflare Block');
            }
        }

        const partials: BaytPartialJob[] = [];

        // In Bayt, jobs are in li elements. The safest way is to find h2 tags
        $('h2').each((i, el) => {
            const cardContext = $(el).closest('li');
            if (!cardContext || cardContext.length === 0) return;

            const rawLink = $(el).find('a').attr('href');
            if (!rawLink || !rawLink.includes('/jobs/')) return;
            const jobUrl = rawLink.startsWith('http') ? rawLink : this.baseUrl + rawLink;
            
            const match = jobUrl.match(/-([0-9]+)\/?$/);
            const source_job_id = match ? match[1] : '';
            if (!source_job_id) return;

            const title = $(el).text().trim();
            
            let company_name = cardContext.find('.job-company-location-wrapper a').first().text().trim();
            if (!company_name) company_name = cardContext.find('.job-company-location-wrapper div').first().text().trim();
            if (!company_name) company_name = 'Confidential Company';
            
            let location = cardContext.find('.jb-label-location').text().trim();
            let career_level = cardContext.find('.jb-label-careerlevel').text().trim();
            let posted_time = cardContext.find('.jb-date').text().replace(/\s+/g, ' ').trim();
            let logo_url = cardContext.find('.jb-logo').attr('src') || '';
            if (logo_url.startsWith('//')) logo_url = 'https:' + logo_url;
            let description = cardContext.find('.jb-descr').text().trim();

            if (title && !partials.some(p => p.source_job_id === source_job_id)) {
                partials.push({
                    source_job_id,
                    url: jobUrl,
                    title,
                    company_name,
                    location,
                    posted_time,
                    logo_url,
                    description,
                    career_level,
                    scraped_at: new Date()
                });
            }
        });

        // ── Pagination Loop Detection ──────────────────────────────────────────
        // Bayt returns the LAST page's results for any out-of-range page number.
        // We detect this by comparing current page IDs to previous page IDs.
        const currentPageIds = new Set(partials.map(p => p.source_job_id));
        if (partials.length > 0 && this.previousPageIds.size > 0) {
            let overlap = 0;
            for (const id of currentPageIds) {
                if (this.previousPageIds.has(id)) overlap++;
            }
            // If 80%+ of jobs on this page were on the previous page, it's a loop
            if (overlap / partials.length >= 0.8) {
                console.log(`[Bayt] 🔄 Pagination loop detected at page ${actualPage}! (${overlap}/${partials.length} jobs are duplicates from previous page)`);
                throw new Error('Loop Detected: Bayt pagination wrapped around');
            }
        }
        this.previousPageIds = currentPageIds;
        // ────────────────────────────────────────────────────────────────────────

        const finalJobs: JobEntity[] = [];
        let idx = 1;

        // Process detail pages with max 3 concurrent tabs using persistent session as fallback
        const DETAIL_CONCURRENCY = 3;

        async function processDetail(scraper: BaytScraper, partial: BaytPartialJob, retryIdx: number): Promise<JobEntity> {
            let retries = 0;
            while (retries < 3) {
                try {
                    const entity = await scraper.scrapeJobDetail(partial.source_job_id, partial);
                    if (entity) return entity;
                } catch (e: any) {
                    const isCloudflare = e.message?.includes('Cloudflare') || e.message?.includes('Timeout');
                    if (isCloudflare && retries < 2) {
                        console.warn(`[Bayt] CF/Timeout on detail ${partial.source_job_id}. Switching to persistent session... (Retry ${retries + 1}/3)`);
                        try {
                            const html = await scraper.fetchWithPersistentBrowser(partial.url);
                            // Re-parse with fallback html by temporarily patching the partial
                            const entity = await scraper.scrapeJobDetailFromHtml(partial.source_job_id, partial, html);
                            if (entity) return entity;
                        } catch (fe: any) {
                            console.error(`[Bayt] Persistent fallback also failed for ${partial.source_job_id}: ${fe.message}`);
                        }
                        retries++;
                    } else {
                        break;
                    }
                }
            }
            return scraper.mapPartialToEntity(partial);
        }

        for (let b = 0; b < partials.length; b += DETAIL_CONCURRENCY) {
            const chunk = partials.slice(b, b + DETAIL_CONCURRENCY);
            if (strictSkipUrls) {
                const filtered = chunk.filter(p => !strictSkipUrls.has(p.url));
                if (filtered.length === 0) { idx += chunk.length; continue; }
            }
            console.log(`[Bayt] Processing details ${idx}-${Math.min(idx + DETAIL_CONCURRENCY - 1, partials.length)} / ${partials.length} (3 tabs)...`);
            
            // Stagger tab openings by 800ms to avoid simultaneous CF detection
            const results = await Promise.all(
                chunk.map((partial, i) =>
                    new Promise<JobEntity>(resolve =>
                        setTimeout(() => processDetail(this, partial, i).then(resolve), i * 800)
                    )
                )
            );
            finalJobs.push(...results);
            idx += chunk.length;
            await new Promise(r => setTimeout(r, 2000));
        }

        return { jobs: finalJobs, foundCards: partials.length };
    }

    private async scrapeJobDetail(jobId: string, partialJob: BaytPartialJob): Promise<JobEntity | null> {
        let html = '';
        try {
            // Bayt limits fast requests. We use Playwright for details too.
            html = await this.withBrowser(async (page: Page) => {
                await page.goto(partialJob.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                return await page.content();
            }, true);
        } catch (e: any) {
            console.error(`[Bayt] Detail error ${jobId}: ${e.message}`);
            throw e;
        }

        const $ = cheerio.load(html);
        const pageTitle = $('title').text();
        if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
            throw new Error('Cloudflare Block');
        }

        return this.parseJobDetailHtml(jobId, partialJob, html);
    }

    // Public so processDetail() helper function can call it with fallback HTML
    public async scrapeJobDetailFromHtml(jobId: string, partialJob: BaytPartialJob, html: string): Promise<JobEntity | null> {
        const $ = cheerio.load(html);
        const pageTitle = $('title').text();
        if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare')) {
            throw new Error('Cloudflare Block');
        }
        return this.parseJobDetailHtml(jobId, partialJob, html);
    }

    private async parseJobDetailHtml(jobId: string, partialJob: BaytPartialJob, html: string): Promise<JobEntity | null> {
        const $ = cheerio.load(html);
        let job_type = 'Not Specified';
        let requirements = '';
        let fullDescription = '';
        let experience_needed = 'Not Specified';
        let education_level = 'Not Specified';
        let salary = 'Not Specified';
        let job_categories = 'Not Specified';
        let work_type = 'Not Specified';
        let career_level = partialJob.career_level || 'Not Specified';
        let open_positions = 1;
        let posted_time_str = partialJob.posted_time || '';
        let skills = '';

        // Bayt Detail Page Parsing
        const contentDiv = $('.t-break').text();
        if (contentDiv) {
            fullDescription = $('.t-break').text().replace(/\s+/g, ' ').trim();
        } else {
            fullDescription = partialJob.description || '';
        }

        // Map icons to their parent text
        $('.icon').each((i, el) => {
            const className = $(el).attr('class') || '';
            const parent = $(el).parent();
            const parentText = parent.text().replace(/\s+/g, ' ').trim();
            
            // Skip action buttons
            const tagName = parent.prop('tagName');
            if (tagName && (tagName.toLowerCase() === 'button' || tagName.toLowerCase() === 'a')) return;
            
            if (className.includes('is-salary')) salary = parentText;
            if (className.includes('is-home')) work_type = parentText;
            if (className.includes('is-users')) {
                const match = parentText.match(/(\d+)/);
                if (match) open_positions = parseInt(match[1]);
            }
            if (className.includes('is-briefcase')) {
                // e.g. "Full time · Mid career · 1 - 3 Years of Experience"
                const parts = parentText.split(/[·]/).map(p => p.trim());
                if (parts.length >= 1 && parts[0]) job_type = parts[0];
                if (parts.length >= 2 && parts[1]) career_level = parts[1];
                if (parts.length >= 3 && parts[2]) experience_needed = parts[2];
            }
            if (className.includes('is-flash2')) {
                // e.g. "5 days ago · Easy Apply"
                const parts = parentText.split(/[·]/).map(p => p.trim());
                if (parts.length >= 1 && parts[0].includes('ago')) {
                    posted_time_str = parts[0];
                }
            }
        });

        // The description is typically the largest .t-break
        let descDiv: any = null;
        $('.t-break').each((i, el) => {
            if ($(el).html() && $(el).html()!.length > (descDiv && descDiv.html() ? descDiv.html().length : 0)) {
                descDiv = $(el);
            }
        });

        const kwRegex = /skills?|requirements?|required|qualifications?|what we(?:'re| are) looking for|what you(?:'ll| will) need|what you bring|what makes you a good fit|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies|core technologies|technologies|what you(?:'ll| will) do|responsibilities/i;

        if (descDiv) {
            let rawHtml = descDiv.html() || '';
            
            // Replace block elements and line breaks with newline characters to simulate visual lines
            rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
            rawHtml = rawHtml.replace(/<\/p>/gi, '\n');
            rawHtml = rawHtml.replace(/<\/div>/gi, '\n');
            rawHtml = rawHtml.replace(/<li[^>]*>/gi, '\n- '); // INJECT BULLET FOR LI
            rawHtml = rawHtml.replace(/<\/li>/gi, '');
            rawHtml = rawHtml.replace(/<\/h[1-6]>/gi, '\n');
            rawHtml = rawHtml.replace(/<\/ul>/gi, '\n');
            rawHtml = rawHtml.replace(/<\/ol>/gi, '\n');
            
            // Remove all remaining HTML tags
            let textContent = rawHtml.replace(/<[^>]+>/g, ' ');
            
            // Decode basic entities
            textContent = textContent.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
            
            const lines = textContent.split('\n').map((l: string) => l.replace(/\s+/g, ' ').trim()).filter((l: string) => l.length > 0);
            
            let isCapturing = false;
            let extractedSkills: string[] = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Check if this line is a header
                const isShort = line.length > 0 && line.length < 60;
                // bullet check: starts with -, *, number, or various unicode bullet points
                const isBullet = /^[-*\d\u2022\u2023\u25E6\u2043\u2219]+\.?/.test(line); 
                
                if (isShort && !isBullet) {
                    if (kwRegex.test(line)) {
                        isCapturing = true;
                        continue; // skip the header line itself
                    } else if (isCapturing) {
                        // If it's a DIFFERENT header, stop capturing to avoid bleeding into "Benefits" etc.
                        if (/benefits|what we offer|about us|company|how to apply|who we are|our mission/i.test(line)) {
                            isCapturing = false;
                        }
                    }
                }
                
                // IMPLICIT SKILLS DETECTION (If no header was found, but it's a bullet list of requirements)
                if (isBullet && !isCapturing) {
                    if (/(experience|ability|familiarity|skills?|proficien|knowledge|degree|bachelor|master|capable|understanding|track record|expertise|proven|good command)\b/i.test(line)) {
                        isCapturing = true; // Turn on capturing implicitly
                    }
                }
                
                // Inline headers (e.g. "Experience: 5 years...")
                if (!isCapturing && line.length >= 60 && /(?:experience|requirements?|qualifications?|skills?|responsibilities|nice to have)\s*:/i.test(line)) {
                    isCapturing = true;
                    extractedSkills.push(line);
                    continue;
                }
                
                if (isCapturing) {
                    extractedSkills.push(line);
                }
            }
            
            if (extractedSkills.length > 0) {
                const joined = extractedSkills.join(' | ');
                skills = skills ? skills + ' | ' + joined : joined;
            }
        }

        // Standard headings extraction (for "Easy Apply" / standard jobs where Skills are in separate sections)
        $('h2, h3, h4').each((i, el) => {
            const text = $(el).text().trim().toLowerCase();
            
            // Extract standard skills if they are in a dedicated section
            if (text.length > 0 && text.length < 50 && kwRegex.test(text)) {
                const extracted = $(el).next('div').text().replace(/\s+/g, ' ').trim();
                if (extracted.length > 5 && !skills.includes(extracted)) {
                    skills = skills ? skills + ' | ' + extracted : extracted;
                }
            }
            
            // Keep the old grid logic for Preferred candidate and Job Details
            if (text === 'preferred candidate') {
                const nextElem = $(el).next('div');
                nextElem.find('[data-automation-id^="label_"]').each((j, labelDiv) => {
                    const key = $(labelDiv).text().replace(/\s+/g, ' ').trim().toLowerCase();
                    const value = $(labelDiv).next('[data-automation-id^="data_"]').text().replace(/\s+/g, ' ').trim();
                    
                    if (key.includes('career level')) career_level = value;
                    if (key.includes('degree')) education_level = value;
                    if (key.includes('years of experience')) experience_needed = value;
                });
            } else if (text === 'job details') {
                const nextElem = $(el).next('div');
                nextElem.find('[data-automation-id^="label_"]').each((j, labelDiv) => {
                    const key = $(labelDiv).text().replace(/\s+/g, ' ').trim().toLowerCase();
                    const value = $(labelDiv).next('[data-automation-id^="data_"]').text().replace(/\s+/g, ' ').trim();
                    if (key.includes('job role')) job_categories = value;
                    if (key.includes('employment type')) job_type = value;
                    if (key.includes('monthly salary')) salary = value;
                });
            }
        });

        // --- AI FALLBACK FOR SKILLS ---
        // If the programmatic scraper failed to find skills (or found very little), delegate to Gemini
        if (!skills || skills.length < 15) {
            console.log(`[Bayt] Programmatic skills extraction failed for ${jobId}. Firing up Gemini AI...`);
            try {
                const extractedByAI = await this.aiAgent.extractSkills(fullDescription);
                if (extractedByAI && extractedByAI.length > 0) {
                    skills = extractedByAI.join(' | ');
                    console.log(`[Bayt] Gemini successfully extracted ${extractedByAI.length} skills!`);
                } else {
                    console.log(`[Bayt] Gemini also found no skills for ${jobId}.`);
                }
            } catch (err) {
                console.error(`[Bayt] Gemini fallback failed for ${jobId}:`, err);
            }
        }

        // Convert posted time to date format (DD-MM-YYYY)
        const parsedDate = this.parseRelativeDate(posted_time_str);

        // Guess Experience Needed from Career Level if empty
        if (experience_needed === 'Not Specified' || experience_needed.trim() === '') {
            const cl = career_level.toLowerCase();
            if (cl.includes('student') || cl.includes('fresh')) {
                experience_needed = '0 Years';
            } else if (cl.includes('entry')) {
                experience_needed = '0-3 Years';
            } else if (cl.includes('mid')) {
                experience_needed = '3-5 Years';
            } else if (cl.includes('management') || cl.includes('manager')) {
                experience_needed = '5-10 Years';
            } else if (cl.includes('director') || cl.includes('head') || cl.includes('senior executive')) {
                experience_needed = '10+ Years';
            }
        }

        return {
            source_job_id: jobId,
            url: partialJob.url,
            title: partialJob.title,
            company_name: partialJob.company_name,
            company_url: '',
            location: partialJob.location,
            posted_time: parsedDate,
            logo_url: partialJob.logo_url,
            job_type: job_type,
            work_type: work_type, 
            experience_needed: experience_needed,
            career_level: career_level,
            education_level: education_level,
            salary: salary,
            job_categories: job_categories,
            skills: skills,
            description: fullDescription,
            requirements: requirements,
            job_status: 'Open',
            open_positions: open_positions,
            viewed: 0,
            in_consideration: 0,
            not_selected: 0,
            scraped_at: partialJob.scraped_at
        };
    }

    private parseRelativeDate(relativeStr: string): string {
        const today = new Date();
        const s = relativeStr.toLowerCase().trim();
        
        if (s.includes('yesterday')) {
            today.setDate(today.getDate() - 1);
        } else if (s.includes('day')) {
            const match = s.match(/(\d+)/);
            if (match) today.setDate(today.getDate() - parseInt(match[1]));
        } else if (s.includes('month')) {
            const match = s.match(/(\d+)/);
            if (match) today.setMonth(today.getMonth() - parseInt(match[1]));
        } else if (s.includes('year')) {
            const match = s.match(/(\d+)/);
            if (match) today.setFullYear(today.getFullYear() - parseInt(match[1]));
        } // if hours/mins/today -> keep today

        const d = String(today.getDate()).padStart(2, '0');
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const y = today.getFullYear();
        return `${d}-${m}-${y}`;
    }

    private mapPartialToEntity(partialJob: BaytPartialJob): JobEntity {
        return {
            source_job_id: partialJob.source_job_id,
            url: partialJob.url,
            title: partialJob.title,
            company_name: partialJob.company_name,
            company_url: '',
            location: partialJob.location,
            posted_time: this.parseRelativeDate(partialJob.posted_time || ''),
            logo_url: partialJob.logo_url,
            job_type: 'Not Specified',
            work_type: 'Not Specified',
            experience_needed: 'Not Specified',
            career_level: partialJob.career_level || 'Not Specified',
            education_level: 'Not Specified',
            salary: 'Not Specified',
            job_categories: 'Not Specified',
            skills: '',
            description: partialJob.description || '',
            requirements: '',
            job_status: 'Open',
            open_positions: 1,
            viewed: 0,
            in_consideration: 0,
            not_selected: 0,
            scraped_at: partialJob.scraped_at
        };
    }
}
