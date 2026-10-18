import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, PartialJob } from '../../core/ScraperInterface';

interface TanqeebPartialJob extends PartialJob {
    company_url?: string;
    posted_time?: string;
    logo_url?: string;
    job_type?: string | null;
    job_categories?: string | null;
    salary?: string | null;
}

export class TanqeebScraper extends BaseScraper {
    name = 'Tanqeeb';
    baseUrl = 'https://egypt.tanqeeb.com';

    private headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
    };

    public async fetchTotalJobs(): Promise<number> {
        try {
            const url = `${this.baseUrl}/s/jobs/jobs-in-egypt?page=1`;
            const res = await axios.get(url, { headers: this.headers, timeout: 15000 });
            const $ = cheerio.load(res.data);
            
            // Search header often displays e.g. "Showing 1 - 25 of 12,450 jobs"
            const pageText = $('body').text();
            const match = pageText.match(/(\d[\d,]+)\s*(?:jobs|وظيفة|وظائف)/i);
            if (match) {
                const total = parseInt(match[1].replace(/,/g, ''), 10);
                if (!isNaN(total) && total > 500) {
                    console.log(`[Tanqeeb] Detected Total Jobs: ${total}`);
                    return total;
                }
            }
        } catch (e: any) {
            console.log(`[Tanqeeb] Could not auto-detect total jobs: ${e.message}`);
        }
        return 15000; // Sensible default for Egypt
    }

    public async isJobClosed(jobUrl: string): Promise<boolean> {
        try {
            const res = await axios.get(jobUrl, { headers: this.headers, timeout: 10000 });
            const html = res.data.toLowerCase();
            if (html.includes('job is closed') || html.includes('الوظيفة مغلقة') || html.includes('لم تعد متاحة') || html.includes('expired')) {
                return true;
            }
            return false;
        } catch (e: any) {
            if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
            return false;
        }
    }

    public async scrapeJobs(options?: any): Promise<JobEntity[]> {
        return [];
    }

    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        const url = `${this.baseUrl}/s/jobs/jobs-in-egypt?page=${pageNumber}`;
        console.log(`[Tanqeeb] Scraping Search Page ${pageNumber}: ${url}`);

        let html = '';
        try {
            const res = await axios.get(url, { headers: this.headers, timeout: 20000 });
            html = res.data;
        } catch (e: any) {
            console.error(`[Tanqeeb] Failed to fetch page ${pageNumber}:`, e.message);
            return { jobs: [], foundCards: 0 };
        }

        const $ = cheerio.load(html);
        const partials: TanqeebPartialJob[] = [];

        // Select all job cards
        $('a.search-job-title-link, a[href*="/jobs/"]').each((_, el) => {
            const rawHref = $(el).attr('href');
            if (!rawHref || !rawHref.includes('/jobs/') || !rawHref.endsWith('.html')) return;

            const jobUrl = rawHref.startsWith('http') ? rawHref : `${this.baseUrl}${rawHref}`;
            
            // Extract source ID from digits in URL (e.g. /jobs/021311637.html)
            const idMatch = jobUrl.match(/(\d+)\.html/);
            const source_job_id = idMatch ? idMatch[1] : '';
            if (!source_job_id) return;

            // Avoid duplicate in same page
            if (partials.some(p => p.url === jobUrl)) return;

            // Job Title
            let title = $(el).text().trim();
            if (!title) {
                title = $(el).closest('h2').text().trim();
            }

            // Find surrounding card container
            const cardContext = $(el).closest('.search-job-card, .card, div[class*="job"]');

            // Company Name
            let company_name = cardContext.find('.search-job-source').text().trim();
            company_name = company_name.replace(/\s+jobs$/i, '').trim();
            if (!company_name) company_name = 'Confidential';

            // Job Type / Work Type
            const job_type = cardContext.find('.search-job-tag').text().trim() || 'Full Time';

            // Location
            let location = cardContext.find('.search-job-workplace-location').text().trim();
            location = location.replace(/^On-site\s*-\s*/i, '').replace(/^Remote\s*-\s*/i, '').trim();
            if (!location) location = 'Egypt';

            // Posted Time
            const posted_time = cardContext.find('.search-job-date').text().trim() || 'Recently';

            // Category
            const category = cardContext.find('.search-job-categories').text().trim() || null;

            partials.push({
                source_job_id,
                url: jobUrl,
                title,
                company_name,
                company_url: this.baseUrl,
                location,
                posted_time,
                job_type,
                job_categories: category,
                salary: null,
                scraped_at: new Date()
            });
        });

        const foundCards = partials.length;
        if (foundCards === 0) {
            return { jobs: [], foundCards: 0 };
        }

        // Filter out URLs already in database
        const candidates = strictSkipUrls ? partials.filter(p => !strictSkipUrls.has(p.url)) : partials;
        console.log(`[Tanqeeb] Page ${pageNumber}: ${foundCards} cards found, ${candidates.length} new candidates to process.`);

        const finalEntities: JobEntity[] = [];

        // Process details concurrently in batches of 4
        const BATCH_SIZE = 4;
        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (part) => {
                let description = `${part.title} at ${part.company_name} located in ${part.location}.`;
                let requirements = '';

                try {
                    const detailRes = await axios.get(part.url, { headers: this.headers, timeout: 15000 });
                    const detail$ = cheerio.load(detailRes.data);

                    // Extract description text
                    const descSection = detail$('div[class*="description"], div[class*="job-desc"], article').text().trim();
                    if (descSection && descSection.length > 50) {
                        description = descSection.replace(/\s+/g, ' ').trim();
                    } else {
                        // Fallback to body content without header/footer
                        const allH2Text = detail$('h2, p').map((_, e) => detail$(e).text().trim()).get().join('\n');
                        if (allH2Text.length > 50) {
                            description = allH2Text.slice(0, 1500);
                        }
                    }
                } catch (e) {
                    // Non-fatal, use basic description
                }

                return {
                    source_job_id: part.source_job_id,
                    url: part.url,
                    title: part.title,
                    company_name: part.company_name,
                    company_url: part.company_url,
                    location: part.location,
                    posted_time: part.posted_time || 'Recently',
                    job_type: part.job_type || 'Full Time',
                    work_type: part.location.toLowerCase().includes('remote') ? 'Remote' : 'On-site',
                    experience_needed: null,
                    career_level: null,
                    education_level: null,
                    salary: null,
                    job_categories: part.job_categories,
                    skills: null,
                    description,
                    requirements,
                    job_status: 'Open',
                    open_positions: 1,
                    viewed: 0,
                    in_consideration: 0,
                    not_selected: 0,
                    scraped_at: new Date()
                } as JobEntity;
            });

            const resolved = await Promise.all(batchPromises);
            finalEntities.push(...resolved);

            // Small jitter between detail batches
            await new Promise(r => setTimeout(r, 200));
        }

        return { jobs: finalEntities, foundCards };
    }
}
