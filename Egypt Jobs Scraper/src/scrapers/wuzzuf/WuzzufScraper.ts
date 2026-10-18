import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, ScrapeOptions } from '../../core/ScraperInterface';
import axios from 'axios';

export class WuzzufScraper extends BaseScraper {
    name = 'Wuzzuf';
    baseUrl = 'https://wuzzuf.net';
    private categoryFilter: string = '';

    constructor(categoryFilter: string = '') {
        super();
        this.categoryFilter = categoryFilter;
    }

    public async fetchTotalJobs(): Promise<number> {
        try {
            console.log('[WuzzufScraper] Fetching total jobs from Wuzzuf API...');
            const response = await axios.get('https://wuzzuf.net/api/search/job?q=&page[offset]=0&page[limit]=1');
            const total = response.data?.meta?.totalResultsCount || 0;
            console.log(`[WuzzufScraper] Total Jobs found: ${total}`);
            return total;
        } catch (e) {
            console.error('[WuzzufScraper] Failed to fetch total jobs:', e);
            return 0;
        }
    }

    public async discover(keyword: string, location: string, pageIndex: number, days: number): Promise<{ jobs: JobEntity[]; blocked: boolean; reason?: string }> {
        try {
            // Wuzzuf API uses offset based pagination. The JobCollector passes pageIndex (0, 1, 2, ...)
            const pageSize = 15;
            const offset = pageIndex * pageSize;
            const url = `https://wuzzuf.net/api/search/job?q=${encodeURIComponent(keyword)}&page[offset]=${offset}&page[limit]=${pageSize}`;
            const response = await axios.get(url);
            
            const data = response.data?.data || [];
            
            const jobs: JobEntity[] = data.map((item: any) => {
                const id = item.id;
                return {
                    source_job_id: id,
                    url: `https://wuzzuf.net/jobs/p/${id}`,
                    // Dummy values, will be filled by detail()
                    title: 'Loading...',
                    company_name: 'Loading...',
                    scraped_at: new Date()
                } as JobEntity;
            });
            
            return { jobs, blocked: false };
        } catch (e: any) {
            if (e.response && e.response.status === 403) {
                return { jobs: [], blocked: true, reason: 'Turnstile Blocked (403)' };
            }
            console.error(`[WuzzufScraper] Discover failed for pageIndex=${pageIndex}:`, e.message);
            return { jobs: [], blocked: false };
        }
    }

    public async detail(url: string): Promise<any> {
        const sourceIdMatch = url.match(/\/p\/([a-f0-9\-]+)/);
        if (!sourceIdMatch) return { success: false };
        const id = sourceIdMatch[1];
        
        try {
            const apiUrl = `https://wuzzuf.net/api/job/${id}?include=company`;
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const jobData = response.data.data;
            const included = response.data.included || [];
            if (!jobData) return { success: false };
            
            const attrs = jobData.attributes || {};
            const companyRelId = jobData.relationships?.company?.data?.id;
            const companyData = included.find((item: any) => item.type === 'company' && item.id === companyRelId) || {};
            
            const title = attrs.title || '';
            const companyName = companyData.attributes?.name || 'Confidential';
            const compSlug = companyData.attributes?.slug;
            
            let companyUrl = companyData.links?.profile
                ? `${this.baseUrl}/${companyData.links.profile}`
                : (compSlug ? `${this.baseUrl}/jobs/careers/${compSlug}` : '');
                
            if (companyUrl) {
                companyUrl = companyUrl.replace(/\/jobs\/c\//g, '/jobs/careers/');
            }
            if (!companyUrl) companyUrl = 'Confidential';
            
            const locArea = attrs.location?.area?.name || '';
            const locCity = attrs.location?.city?.name || '';
            const jsonLocation = [locArea, locCity].filter(Boolean).join(', ');
            
            const postedAt = attrs.postedAt || '';
            const logo = companyData.links?.defaultLogoUrl || companyData.attributes?.logo ? (companyData.attributes?.logo?.startsWith('http') ? companyData.attributes.logo : `https://images.wuzzuf-data.net/files/company_logo/${companyData.attributes.logo}`) : '';
            
            const status = attrs.status || 'Open';
            
            // --- WORK MODE ---
            let workType = attrs.workplaceArrangement?.displayedName || '';
            if (!workType && attrs.workTypes) {
                const types = attrs.workTypes.map((t: any) => t.displayedName);
                if (types.includes('Remote')) workType = 'Remote';
                else if (types.includes('Hybrid')) workType = 'Hybrid';
                else if (types.includes('Work From Home')) workType = 'Remote';
            }
            if (!workType) {
                const descLower = (attrs.description || '').toLowerCase();
                if (descLower.includes('remote') || descLower.includes('work from home')) workType = 'Remote';
                else if (descLower.includes('hybrid')) workType = 'Hybrid';
                else workType = 'On-site';
            }
            const jobTypeArr = attrs.workTypes?.map((wt: any) => wt.displayedName).join(', ') || '';
            
            const expMin = attrs.workExperienceYears?.min;
            const expMax = attrs.workExperienceYears?.max;
            let exp = '';
            if (expMin !== null && expMax !== null && expMin !== undefined && expMax !== undefined) exp = `${expMin}-${expMax} years`;
            else if (expMin !== null && expMin !== undefined) exp = `Min ${expMin} years`;
            else if (expMax !== null && expMax !== undefined) exp = `Max ${expMax} years`;
            else exp = 'Not Specified';
            
            const career = attrs.careerLevel?.name || '';
            const edu = attrs.candidatePreferences?.educationLevel?.name || '';
            
            let sal = 'Confidential';
            if (attrs.salary) {
                if (attrs.salary.isPaid === false) {
                    sal = 'Unpaid';
                } else {
                    const min = attrs.salary.min;
                    const max = attrs.salary.max;
                    const currObj = attrs.salary.currency;
                    const curr = (typeof currObj === 'string' ? currObj : currObj?.name ?? currObj?.code ?? '');
                    const periodObj = attrs.salary.period;
                    const period = (typeof periodObj === 'string' ? periodObj : periodObj?.name ?? '');
                    const add = attrs.salary.additionalDetails;

                    if (min && max) sal = `${min}-${max} ${curr} ${period}`.trim();
                    else if (min) sal = `Min ${min} ${curr} ${period}`.trim();
                    else if (add) sal = add;
                }
            }

            let desc = attrs.description || '';
            let reqs = attrs.requirements || '';
            desc = desc.replace(/(<([^>]+)>)/gi, "").trim();
            reqs = reqs.replace(/(<([^>]+)>)/gi, "").trim();
            
            const applicants = attrs.applicationsCount || 0;
            const views = attrs.viewsCount || 0;
            const openPos = attrs.vacancies || 1;
            
            const job: JobEntity = {
                source_job_id: id,
                url: url,
                title: title,
                company_name: companyName,
                company_url: companyUrl,
                location: jsonLocation,
                posted_time: postedAt,
                logo_url: logo,
                job_type: jobTypeArr,
                work_type: workType,
                work_mode: workType,
                experience_needed: exp,
                career_level: career,
                education_level: edu,
                salary: sal,
                job_categories: attrs.workRoles?.map((r: any) => r.name).join(', ') || null,
                skills: attrs.keywords?.map((s: any) => s.name).join(', ') || 'Not Specified',
                description: desc,
                requirements: reqs,
                job_status: status,
                applicants: applicants,
                open_positions: openPos,
                viewed: views,
                in_consideration: attrs.inConsideration || 0,
                not_selected: attrs.notSelected || 0,
                scraped_at: new Date(),
                raw_folder_data: 'v3_api_fast'
            };
            
            return { success: true, html: '', parsedData: job };
        } catch (e: any) {
            if (e.response && e.response.status === 404) return { success: false, closed: true };
            console.error(`[WuzzufScraper] Detail failed for ${url}:`, e.message);
            return { success: false };
        }
    }

    protected async fetchHtml(url: string, options?: any): Promise<string> {
        return ''; 
    }

    protected async scrapeJobs(options?: ScrapeOptions): Promise<JobEntity[]> {
        return (await this.discover('', '', 0, 30)).jobs;
    }

    public async scrapeSpecificPage(start: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        console.log(`[WuzzufScraper] Fetching search page with offset ${start}...`);
        const res = await this.discover('', '', start, 30);
        
        const jobs: JobEntity[] = [];
        for (const partialJob of res.jobs) {
            const cleanUrl = partialJob.url.toLowerCase().split('?')[0]; // Simple normalization for Wuzzuf
            if (strictSkipUrls && strictSkipUrls.has(cleanUrl)) {
                continue;
            }
            try {
                const detailRes = await this.detail(partialJob.url);
                if (detailRes.success && detailRes.parsedData) {
                    jobs.push(detailRes.parsedData);
                }
            } catch (e) {
                console.error(`[WuzzufScraper] Failed detail for ${partialJob.url}`, e);
            }
        }
        
        return { jobs, foundCards: res.jobs.length };
    }

    public async isJobClosed(url: string): Promise<boolean> {
        const sourceIdMatch = url.match(/\/p\/([a-f0-9\-]+)/);
        if (!sourceIdMatch) return true;
        try {
            const apiUrl = `https://wuzzuf.net/api/job/${sourceIdMatch[1]}`;
            const res = await axios.get(apiUrl);
            const jobStatus = res.data?.data?.attributes?.status;
            if (jobStatus && ['expired', 'closed', 'archived', 'rejected', 'deleted'].includes(jobStatus.toLowerCase())) {
                return true;
            }
            return false;
        } catch (e: any) {
            if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
            return false;
        }
    }
}
