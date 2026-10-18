const fs = require('fs');
let content = fs.readFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', 'utf8');

const regex = /public async scrapeJobDetail[\s\S]*?not_selected: 0,\s*scraped_at: partialJob\.scraped_at\s*\};\s*\}/;

const newMethod =     public async scrapeJobDetail(jobId: string, partialJob: PartialJob): Promise<JobEntity | null> {
        console.log('[Indeed] Scraping Full Page Detail for ' + jobId + '...');
        let html;
        try {
            const url = 'https://eg.indeed.com/viewjob?jk=' + jobId;
            html = await this.fetchHtml(url);
        } catch (e) {
            console.error('[Indeed] Detail fetch failed for ' + jobId, e);
            return null;
        }
        const parsed = IndeedJobDetailParser.parse(html);
        if (!parsed.description) {
            console.log('[Indeed] Empty description for ' + jobId + ', probably blocked or expired.');
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
            posted_time: '',
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
    };

content = content.replace(regex, newMethod);

const delayRegex = /\/\/ Anti-bot delay\s*await new Promise\(r => setTimeout\(r, 5000\)\);/;
const newDelay = // Anti-bot decimal jitter (0.5s to 5.4s) as requested by user
            const minMs = 500;
            const maxMs = 5400;
            const randomDelay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
            console.log('[Anti-Bot] Decimal Jitter: Waiting ' + (randomDelay / 1000).toFixed(2) + 's...');
            await new Promise(r => setTimeout(r, randomDelay));;

content = content.replace(delayRegex, newDelay);

fs.writeFileSync('src/scrapers/indeed/IndeedBrowserScraper.ts', content);
console.log('IndeedBrowserScraper logic updated successfully!');
