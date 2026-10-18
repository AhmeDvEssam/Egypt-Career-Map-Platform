
import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, ScrapeOptions } from '../../core/ScraperInterface';
import * as cheerio from 'cheerio';
import * as axios from 'axios';

export class LinkedInScraper extends BaseScraper {
    name = 'LinkedIn';
    baseUrl = 'https://www.linkedin.com';
    defaultPageSize = 25;

    private headersGuest = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    };

    public getHeaders(): string[] {
        return [
            'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type',
            'Posted Time', 'Job URL', 'Logo',
            'Description', 'Industry', 'Valid Through',
            'Applicants', 'Source', 'Job Status'
        ];
    }

    private keywords = [
        'Sales', 'Marketing', 'Engineering', 'Software', 'HR', 'Accountant', 'Teacher',
        'Customer Service', 'Medical', 'Construction', 'Manager', 'Administrative',
        'Finance', 'Legal', 'Operations', 'Designer', 'Writer', 'Analyst'
    ]; // 18 Keywords

    public async scrapeSpecificPage(page: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        // Virtual Pagination: 40 pages (1000 jobs) per keyword
        const PAGES_PER_KEYWORD = 40;
        const keywordIndex = Math.floor(page / PAGES_PER_KEYWORD);

        if (keywordIndex >= this.keywords.length) {
            console.log('[LinkedIn] All keywords exhausted.');
            return { jobs: [], foundCards: 0 };
        }

        const keyword = this.keywords[keywordIndex];
        const subPage = page % PAGES_PER_KEYWORD;
        const start = subPage * this.defaultPageSize;

        // URL Strategy:
        // keywords = Specific Industry
        // sortBy = DD (Date Posted) -> Fresh content, less loops
        // location = Egypt
        const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Egypt&geoId=106155005&trk=public_jobs_jobs-search-bar_search-submit&position=1&pageNum=0&start=${start}&sortBy=DD`;

        console.log(`[LinkedIn] Fetching [${keyword}] Offset ${start}...`);

        let html = '';
        try {
            const resp = await axios.default.get(url, { headers: this.headersGuest, timeout: 15000 });
            html = resp.data;
        } catch (e: any) {
            // If error, maybe move to next keyword?
            console.error(`[LinkedIn] Error: ${e.message}`);
            return { jobs: [], foundCards: 0 };
        }

        const $ = cheerio.load(html);
        const jobCards = $('.job-search-card');
        const foundCards = jobCards.length;

        // RECURSION: If this keyword is exhausted (0 cards) or has too few, 
        // immediately jump to the next keyword to prevent Collector from stopping.
        // We only do this if we are not at the very end.
        if (foundCards === 0 && keywordIndex < this.keywords.length - 1) {
            console.log(`[LinkedIn] Keyword [${keyword}] seems exhausted. Jumping to next keyword...`);
            // Calculate the start page of the NEXT keyword
            const nextKeywordPage = (keywordIndex + 1) * PAGES_PER_KEYWORD;
            // IMPORTANT: We must update the "page" logic in the caller, but here we just recurse.
            // Warning: JobCollector increments page by 1 (or PAGE_SIZE). 
            // If we return 0 cards, Collector stops.
            // So we must find cards.
            return this.scrapeSpecificPage(nextKeywordPage, strictSkipUrls);
        }

        const jobs: JobEntity[] = [];

        if (foundCards > 0) {
            const firstTitle = $(jobCards[0]).find('.base-search-card__title').text().trim();
            console.log(`[LinkedIn] [${keyword}] First Item: "${firstTitle}"`);
        } else {
            // If no cards found for this keyword/offset, maybe specific keyword is done.
            // But Collector will just move to next page, which is fine.
        }

        console.log(`[LinkedIn] Found ${foundCards} cards. Starting Deep Scrape...`);

        // Parallel Deep Scrape
        const promises = [];
        for (let i = 0; i < foundCards; i++) {
            const card = $(jobCards[i]);
            
            const title = card.find('.base-search-card__title').text().trim();
            if (title.startsWith('**') || title.includes('****')) continue;

            const linkEl = card.find('a.base-card__full-link');
            let fullUrl = linkEl.attr('href') || '';
            if (fullUrl.includes('?')) fullUrl = fullUrl.split('?')[0];
            if (!fullUrl) continue;

            if (strictSkipUrls && strictSkipUrls.has(fullUrl)) continue;

            const company = card.find('.base-search-card__subtitle a').text().trim() || card.find('.base-search-card__subtitle').text().trim();
            const postedAt = card.find('time').attr('datetime') || '';
            const defaultLocation = card.find('.job-search-card__location').text().trim();
            const defaultLogo = card.find('img.artdeco-entity-image').attr('data-delayed-url') || '';

            promises.push((async () => {
                try {
                    const details = await this.scrapeJobDetails(fullUrl);
                    jobs.push({
                        title: title,
                        company_name: company,
                        url: fullUrl,
                        posted_time: postedAt,
                        job_status: 'Active',
                        scraped_at: new Date(),
                        source: 'LinkedIn',
                        description: details.description || '',
                        location: details.location || defaultLocation,
                        logo_url: details.logo || defaultLogo,
                        industry: details.industry || '',
                        employment_type: details.employmentType || '',
                        valid_through: details.validThrough || '',
                        applicants: 0,
                        job_type: details.employmentType || '',
                        career_level: details.seniority || '',
                        requirements: '',
                        experience_needed: '',
                        salary: '',
                        work_type: ''
                    } as any);
                    process.stdout.write('+');
                } catch(e) {
                    process.stdout.write('x');
                }
            })());
        }
        
        await Promise.all(promises);
        console.log('');
        return { jobs, foundCards };
    }

    private async scrapeJobDetails(url: string): Promise<any> {
        try {
            const resp = await axios.default.get(url, { headers: this.headersGuest, timeout: 10000 });
            const $ = cheerio.load(resp.data);

            // Try to parse JSON-LD
            let jsonLd: any = {};
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const data = JSON.parse($(el).html() || '{}');
                    if (data['@type'] === 'JobPosting') {
                        jsonLd = data;
                    }
                } catch (e) { }
            });

            // Extract criteria from HTML (Seniority, Employment type, etc)
            let seniority = '';
            $('.description__job-criteria-item').each((i, el) => {
                const header = $(el).find('.description__job-criteria-subheader').text().trim().toLowerCase();
                if (header.includes('seniority')) {
                    seniority = $(el).find('.description__job-criteria-text').text().trim();
                }
            });

            // If JSON-LD found, it's the most reliable source
            if (jsonLd.description) {
                return {
                    description: this.cleanHtml(jsonLd.description),
                    logo: jsonLd.hiringOrganization?.logo,
                    industry: jsonLd.industry,
                    employmentType: jsonLd.employmentType,
                    validThrough: jsonLd.validThrough,
                    location: jsonLd.jobLocation?.address?.addressLocality,
                    seniority: seniority
                };
            }

            // Fallback to HTML parsing if JSON missing
            return {
                description: $('.description__text').text().trim().replace(/\s+/g, ' '),
                logo: '',
                industry: '',
                employmentType: '',
                seniority: seniority
            };

        } catch (e: any) {
            // 429 or 404
            return {};
        }
    }

    private cleanHtml(html: string): string {
        try {
            // Decode HTML entities (e.g. &lt;strong&gt; -> <strong>)
            // We wrap it in a div to ensure cheerio treats it as body content
            const $ = cheerio.load(`<div>${html}</div>`);
            const text = $.text();

            // Remove tags if any remain (though $.text() handles most)
            return text.replace(/<[^>]*>?/gm, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        } catch (e) {
            return html;
        }
    }

    protected async scrapeJobs(options?: ScrapeOptions): Promise<JobEntity[]> {
        return (await this.scrapeSpecificPage(0)).jobs;
    }

    public async fetchTotalJobs(): Promise<number> {
        return 0; // Unknown
    }

    public async isJobClosed(url: string): Promise<boolean> {
        // Check for "No longer accepting applications" text or redirect
        return false;
    }
}
