import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity } from '../../core/ScraperInterface';
import * as cheerio from 'cheerio';
import * as path from 'path';
import * as fs from 'fs';
import { BrowserContext, Page } from 'playwright';

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

export class GlassdoorScraper extends BaseScraper {
    name = 'Glassdoor';
    baseUrl = 'https://www.glassdoor.com';
    defaultPageSize = 30;

    private context: BrowserContext | null = null;
    private page: Page | null = null;

    private async initBrowser(): Promise<Page> {
        if (!this.context) {
            const userDataDir = path.join(__dirname, '..', '..', '..', 'browser_session');
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true });
            }

            this.context = await chromium.launchPersistentContext(userDataDir, {
                headless: false,
                args: [
                    '--window-position=0,0',
                    '--window-size=800,800',
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-infobars'
                ]
            });
        }

        if (!this.page || this.page.isClosed()) {
            this.page = await this.context!.newPage();
            // Block heavy media/images to accelerate loading while keeping Cloudflare happy
            await this.page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'media'].includes(resourceType)) {
                    return route.abort();
                }
                return route.continue();
            });
        }

        return this.page;
    }

    public async closeBrowser(): Promise<void> {
        if (this.page && !this.page.isClosed()) {
            await this.page.close().catch(() => {});
            this.page = null;
        }
        if (this.context) {
            await this.context.close().catch(() => {});
            this.context = null;
        }
    }

    public async fetchTotalJobs(): Promise<number> {
        try {
            const page = await this.initBrowser();
            const url = `${this.baseUrl}/Job/egypt-jobs-SRCH_IL.0,5_IN69.htm`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            const title = await page.title();
            const match = title.match(/([\d,]+)\s+Egypt\s+jobs/i);
            if (match && match[1]) {
                const total = parseInt(match[1].replace(/,/g, ''), 10);
                console.log(`[Glassdoor] Detected Total Egypt Jobs: ${total}`);
                return total;
            }
        } catch (e: any) {
            console.log(`[Glassdoor] Could not detect total jobs: ${e.message}`);
        }
        return 8500;
    }

    public async isJobClosed(url: string): Promise<boolean> {
        try {
            const page = await this.initBrowser();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(1000);
            const content = await page.content();
            if (
                content.includes('No longer accepting applications') ||
                content.includes('This job has expired') ||
                content.includes('Job is no longer available') ||
                content.includes('404 Not Found')
            ) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    public async scrapeJobs(): Promise<JobEntity[]> {
        return [];
    }

    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        const page = await this.initBrowser();
        const url = pageNumber <= 1 
            ? `${this.baseUrl}/Job/egypt-jobs-SRCH_IL.0,5_IN69.htm`
            : `${this.baseUrl}/Job/egypt-jobs-SRCH_IL.0,5_IN69_IP${pageNumber}.htm`;

        console.log(`[Glassdoor] Navigating to Page ${pageNumber}: ${url}`);

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        } catch (e: any) {
            console.error(`[Glassdoor] Failed to load page ${pageNumber}:`, e.message);
            return { jobs: [], foundCards: 0 };
        }

        // Wait up to 10s for job cards to render
        try {
            await page.waitForSelector('[data-test="jobListing"], li[class*="JobsList_jobListItem"]', { timeout: 10000 });
        } catch (e) {
            console.log('[Glassdoor] Timeout waiting for job cards.');
        }

        await page.waitForTimeout(1500);

        const html = await page.content();
        const $ = cheerio.load(html);

        const cardElements = $('[data-test="jobListing"], li[class*="JobsList_jobListItem"]');
        const foundCards = cardElements.length;
        console.log(`[Glassdoor] Found ${foundCards} job cards on Page ${pageNumber}.`);

        if (foundCards === 0) {
            return { jobs: [], foundCards: 0 };
        }

        const rawList: any[] = [];

        cardElements.each((i, el) => {
            const titleEl = $(el).find('a[data-test="job-title"], a[class*="JobCard_jobTitle"]').first();
            let title = titleEl.text().trim();
            let rawHref = titleEl.attr('href') || '';
            if (rawHref && !rawHref.startsWith('http')) {
                rawHref = `${this.baseUrl}${rawHref}`;
            }

            // Extract job key/id from jl parameter or digits
            const jlMatch = rawHref.match(/jl=(\d+)/) || rawHref.match(/job-listing\/.*-(\d+)\.htm/);
            const source_job_id = jlMatch ? jlMatch[1] : `gd_${i}_${Date.now()}`;

            // Company Name (Clean trailing duplicates or ratings like 4.7)
            let company = $(el).find('[class*="EmployerProfile_compactEmployerName"], [class*="EmployerProfile_employerName"]').first().text().trim();
            // Remove rating e.g. "Babel Audio4.7Babel Audio" -> "Babel Audio"
            company = company.replace(/(\d\.\d).*$/, '').replace(/\d\.\d/g, '').trim();
            if (!company) company = 'Confidential';

            // Salary snippet
            const salary = $(el).find('[data-test="detailSalary"], [class*="JobCard_salaryEstimate"]').first().text().trim() || null;

            // Location
            let location = $(el).find('[data-test="emp-location"], [class*="JobCard_location"]').first().text().trim() || 'Egypt';

            // Age / Posted Date (e.g. "1d", "3d", "30d+", "Today")
            const ageText = $(el).find('[data-test="job-age"], [class*="JobCard_listingAge"]').first().text().trim() || '';

            rawList.push({
                index: i,
                title,
                company_name: company,
                url: rawHref,
                source_job_id,
                salary,
                location,
                age: ageText
            });
        });

        // Filter out existing URLs if provided
        const candidates = strictSkipUrls ? rawList.filter(c => !strictSkipUrls.has(c.url)) : rawList;
        console.log(`[Glassdoor] Processing ${candidates.length} new candidates (out of ${foundCards} cards)...`);

        const jobs: JobEntity[] = [];

        for (const cand of candidates) {
            let description = `${cand.title} at ${cand.company_name} located in ${cand.location}.`;
            
            // Try to click the job card in the left list to read the right-panel full description
            try {
                const cardSelector = `[data-test="jobListing"]:nth-of-type(${cand.index + 1}), li[class*="JobsList_jobListItem"]:nth-of-type(${cand.index + 1})`;
                const cardHandle = await page.$(cardSelector);
                if (cardHandle) {
                    await cardHandle.click({ timeout: 2000 }).catch(() => {});
                    await page.waitForTimeout(400);
                    
                    const descText = await page.$eval(
                        '[data-test="jobDescriptionContent"], .jobDescriptionContent, [class*="JobDetails_jobDescription"]',
                        el => el.textContent || ''
                    ).catch(() => '');

                    if (descText && descText.trim().length > 50) {
                        description = descText.trim().replace(/\s+/g, ' ');
                    }
                }
            } catch (e) {
                // Keep default description on error
            }

            // Calculate real posted_time from age text
            let posted_time = new Date().toISOString();
            if (cand.age) {
                const daysMatch = cand.age.match(/(\d+)\s*d/i);
                const hoursMatch = cand.age.match(/(\d+)\s*h/i);
                if (daysMatch) {
                    const days = parseInt(daysMatch[1], 10);
                    posted_time = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                } else if (hoursMatch) {
                    const hours = parseInt(hoursMatch[1], 10);
                    posted_time = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
                }
            }

            // Work Type
            const combinedText = (cand.title + ' ' + cand.location + ' ' + description).toLowerCase();
            let work_type = 'On-site';
            if (combinedText.includes('remote') || combinedText.includes('work from home') || combinedText.includes('عن بعد')) {
                work_type = 'Remote';
            } else if (combinedText.includes('hybrid') || combinedText.includes('هجين')) {
                work_type = 'Hybrid';
            }

            // Career Level
            let career_level = 'Mid-Level';
            const lowerTitle = cand.title.toLowerCase();
            if (/\b(senior|sr\.?|lead|principal|رئيسي|أول)\b/i.test(lowerTitle)) career_level = 'Senior';
            else if (/\b(junior|jr\.?|fresh|entry|trainee|مبتدئ|حديث)\b/i.test(lowerTitle)) career_level = 'Junior/Entry';
            else if (/\b(intern|internship|تدريب)\b/i.test(lowerTitle)) career_level = 'Internship';
            else if (/\b(manager|head|director|مدير)\b/i.test(lowerTitle)) career_level = 'Manager';
            else if (/\b(executive|vp|chief)\b/i.test(lowerTitle)) career_level = 'Executive';

            // Experience Needed
            let experience_needed: string | null = null;
            const expMatch = (cand.title + ' ' + description).match(/\b(\d{1,2}(?:\s*-\s*\d{1,2})?)\+?\s*(?:years?|yrs?|سنة|سنوات)\b/i);
            if (expMatch) {
                experience_needed = `${expMatch[1]} Years`;
            }

            const entity: JobEntity = {
                source_job_id: cand.source_job_id,
                url: cand.url,
                title: cand.title,
                company_name: cand.company_name,
                company_url: this.baseUrl,
                location: cand.location,
                posted_time,
                job_type: 'Full Time',
                work_type,
                experience_needed,
                career_level,
                education_level: null,
                salary: cand.salary,
                job_categories: null,
                skills: null,
                description,
                requirements: '',
                job_status: 'Open',
                open_positions: 1,
                viewed: 0,
                in_consideration: 0,
                not_selected: 0,
                scraped_at: new Date(),
                source: 'Glassdoor'
            };

            jobs.push(entity);
            if (cand.salary) {
                console.log(`  💰 [SALARY FOUND] ${cand.title} @ ${cand.company_name} -> ${cand.salary}`);
            }
        }

        return { jobs, foundCards };
    }
}
