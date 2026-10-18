import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, PartialJob } from '../../core/ScraperInterface';

interface ForasnaPartialJob extends PartialJob {
    posted_time?: string;
    logo_url?: string;
    job_type?: string;
    job_categories?: string;
    salary?: string;
}

export class ForasnaScraper extends BaseScraper {
    name = 'Forasna';
    baseUrl = 'https://forasna.com';

    public async fetchTotalJobs(): Promise<number> { return 15000; }
    public async isJobClosed(jobUrl: string): Promise<boolean> { return false; }
    public async scrapeJobs(options?: any): Promise<JobEntity[]> { return []; }

    public async scrapeSpecificPage(pageNumber: number, strictSkipUrls?: Set<string>): Promise<{ jobs: JobEntity[], foundCards: number }> {
        const startOffset = pageNumber * 20;
        const url = `${this.baseUrl}/${encodeURI('\u0648\u0638\u0627\u0626\u0641-\u062E\u0627\u0644\u064A\u0629')}?&start=${startOffset}`;
        
        console.log(`[Forasna] Scraping Search Page ${pageNumber}: ${url}`);

        let html = '';
        try {
            const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            html = res.data;
        } catch (e) {
            return { jobs: [], foundCards: 0 };
        }

        const $ = cheerio.load(html);
        const partials: ForasnaPartialJob[] = [];

        $('h2.job-title').each((i, el) => {
            const cardContext = $(el).closest('div').parent();

            const rawLink = $(el).find('a').attr('href');
            if (!rawLink || !rawLink.includes('/job/p/')) return;
            const jobUrl = rawLink.startsWith('http') ? rawLink : this.baseUrl + rawLink;
            const match = jobUrl.match(/-([0-9]+)$/);
            const source_job_id = match ? match[1] : '';
            if (!source_job_id) return;

            let title = $(el).text().trim();
            title = title.replace(new RegExp('\u0648\u0638\u064A\u0641\u0629 \u062E\u0627\u0644\u064A\u0629', 'g'), '').replace(new RegExp('\u0648\u0638\u0627\u0626\u0641 \u062E\u0627\u0644\u064A\u0629', 'g'), '').trim();
            if (title.endsWith('-')) title = title.substring(0, title.length - 1).trim();

            let company_name = cardContext.find('.company-name').text().trim();
            if (!company_name) company_name = cardContext.find('.company-meta > span').first().text().trim();
            
            const tsaffoh = '\u062A\u0635\u0641\u062D \u0627\u0644\u0634\u0631\u0643\u0627\u062A';
            const gheer_mo7addad = '\u063A\u064A\u0631 \u0645\u062D\u062F\u062F';
            
            if (!company_name || company_name.includes(tsaffoh)) company_name = gheer_mo7addad;
            
            let location = cardContext.find('.location-desktop span').first().text().trim();
            if (!location) location = cardContext.find('.location-desktop').text().trim();
            location = location.replace(/^- /g, '').trim();

            const posted_time = cardContext.find('time.job-date').attr('datetime') || '';
            const logo_url = cardContext.find('.company-logo-img').attr('src') || '';

            let job_type = 'Not Specified';
            const categories: string[] = [];
            
            cardContext.find('a.with-info-separator').each((j, link) => {
                const text = $(link).text().trim();
                const jobTypeRegex = new RegExp('\u064A\u0648\u0645 \u0643\u0627\u0645\u0644|\u062F\u0648\u0627\u0645 \u062C\u0632\u0626\u064A|\u0639\u0645\u0644 \u062D\u0631|\u062A\u062F\u0631\u064A\u0628|\u0639\u0646 \u0628\u0639\u062F|\u0634\u064A\u0641\u062A\u0627\u062A');
                if (text.match(jobTypeRegex)) {
                    job_type = text;
                } else if (!text.includes('\u0648\u0638\u064A\u0641\u0629 \u062E\u0627\u0644\u064A\u0629') && !text.includes('\u0648\u0638\u0627\u0626\u0641 \u062E\u0627\u0644\u064A\u0629')) {
                    categories.push(text);
                }
            });
            const job_categories = categories.join(' - ');

            let salary = 'Not Specified';
            const rateb = '\u0627\u0644\u0631\u0627\u062A\u0628';
            cardContext.find('.job-details__title').each((j, span) => {
                if ($(span).text().includes(rateb)) {
                    salary = $(span).next('span').text().trim();
                }
            });

            if (title && title.length > 3 && !partials.some(p => p.source_job_id === source_job_id)) {
                partials.push({ source_job_id, url: jobUrl, title, company_name, location, posted_time, logo_url, job_type, job_categories, salary, scraped_at: new Date() });
            }
        });

        const finalJobs: JobEntity[] = [];
        for (const partial of partials) {
            if (strictSkipUrls && strictSkipUrls.has(partial.url)) continue;
            const jobEntity = await this.scrapeJobDetail(partial.source_job_id, partial);
            if (jobEntity) finalJobs.push(jobEntity);
            await new Promise(r => setTimeout(r, 1000));
        }

        return { jobs: finalJobs, foundCards: partials.length };
    }

    public async scrapeJobDetail(jobId: string, partialJob: ForasnaPartialJob): Promise<JobEntity | null> {
        let html = '';
        try {
            const res = await axios.get(partialJob.url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
            html = res.data;
        } catch (e) {
            return null;
        }
        const $ = cheerio.load(html);
        const pageText = $('body').text().replace(/\s+/g, ' ');

        // Fallback for missing Company Name and Location
        if (partialJob.company_name === '\u063A\u064A\u0631 \u0645\u062D\u062F\u062F' || partialJob.company_name === '') {
            const modalTitle = $('.modal-header__content-job-title').text().replace(/\s+/g, ' ').trim();
            const companyMatch = modalTitle.match(new RegExp(' \u0641\u064A \u0634\u0631\u0643\u0629 (.*)'));
            if (companyMatch && companyMatch[1].trim() !== '') {
                partialJob.company_name = companyMatch[1].trim();
            } else {
                partialJob.company_name = '\u0634\u0631\u0643\u0629 \u063A\u064A\u0631 \u0645\u0639\u0644\u0646\u0629'; // "شركة غير معلنة"
            }
        }
        
        if (!partialJob.location || partialJob.location.trim() === '') {
            const h1Text = $('h1').text().replace(/\s+/g, ' ').trim();
            const cleanH1 = h1Text.replace(new RegExp('\u0648\u0638\u0627\u0626\u0641 \u062E\u0627\u0644\u064A\u0629', 'g'), '').trim();
            // Fallback for single 'وظيفة خالية'
            const cleanH1_2 = cleanH1.replace(new RegExp('\u0648\u0638\u064A\u0641\u0629 \u062E\u0627\u0644\u064A\u0629', 'g'), '').trim();
            let extractedLocation = cleanH1_2.replace(partialJob.title, '').trim();
            extractedLocation = extractedLocation.replace(/^- /g, '').trim();
            if (extractedLocation && extractedLocation !== '') {
                partialJob.location = extractedLocation;
            } else {
                partialJob.location = '\u0645\u0635\u0631'; // "مصر" (Egypt)
            }
        }

        let experience = 'Not Specified';
        const expMatch = pageText.match(new RegExp('\u0633\u0646\u064A\u0646 \u0627\u0644\u062E\u0628\u0631\u0629\\s*(.*?)(?:\u0627\u0644\u062C\u0646\u0633|\u0627\u0644\u0644\u063A\u0629|\u0627\u0644\u0633\u0646|\u0627\u0644\u062D\u0627\u0633\u0628|\u0627\u0644\u0645\u0624\u0647\u0644)'));
        if (expMatch) experience = expMatch[1].trim();
        else {
            const m = pageText.match(new RegExp('\u0633\u0646\u064A\u0646 \u0627\u0644\u062E\u0628\u0631\u0629\\s+([^\\s]+(?:\\s+[^\\s]+){0,3})'));
            if (m) experience = m[1].trim();
        }
        experience = experience.replace(new RegExp('\u0627\u0644\u062C\u0646\u0633.*'), '').replace(new RegExp('\u0627\u0644\u0644\u063A\u0629.*'), '').trim();

        let education = 'Not Specified';
        const eduMatch = pageText.match(new RegExp('\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\\s*(.*?)(?:\u0645\u0627\u064A\u0643\u0631\u0648\u0633\u0648\u0641\u062A|\u0627\u0644\u0631\u0627\u062A\u0628|\u0645\u062C\u0627\u0644|\u062A\u062E\u0635\u0635|\u062A\u0641\u0627\u0635\u064A\u0644)'));
        if (eduMatch) education = eduMatch[1].trim();
        else {
            const m = pageText.match(new RegExp('\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\\s+([^\\s]+(?:\\s+[^\\s]+){0,4})'));
            if (m) education = m[1].trim();
        }
        
        let careerLevel = 'Not Specified';
        const bdoon_kh = '\u0628\u062F\u0648\u0646 \u062E\u0628\u0631\u0629';
        const la_yashtaret = '\u0644\u0627 \u064A\u0634\u062A\u0631\u0637';
        const sana = '\u0633\u0646\u0629';
        const sanatan = '\u0633\u0646\u062A\u0627\u0646';

        if (experience.includes(bdoon_kh) || experience.includes(la_yashtaret)) careerLevel = 'Entry Level / Junior';
        else if (experience.includes(sana) || experience.includes(sanatan) || experience.includes('1-')) careerLevel = 'Junior';
        else if (experience.match(/[3-9]/)) careerLevel = 'Experienced (Non-Manager)';
        else if (experience.match(/1[0-9]/)) careerLevel = 'Manager / Senior';

        let applicants = 0;
        let viewed = 0;
        const appMatch = pageText.match(/(\d+)\s*\u0645\u062A\u0642\u062F\u0645\u064A\u0646/);
        if (appMatch) applicants = parseInt(appMatch[1], 10);
        
        const viewMatch = pageText.match(/(\d+)\s*\u062A\u0645 \u0645\u0634\u0627\u0647\u062F\u062A\u0647\u0645/);
        if (viewMatch) viewed = parseInt(viewMatch[1], 10);

        let description = 'Not Specified';
        const descMatch = pageText.match(new RegExp('\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0648\u0638\u064A\u0641\u0629\\s*(.*?)(?:\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0648\u0638\u064A\u0641\u0629|\u062A\u0642\u062F\u0645 \u0644\u0644\u0648\u0638\u064A\u0641\u0629|\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644)'));
        if (descMatch) description = descMatch[1].trim();
        else {
            const tafaseel = '\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0648\u0638\u064A\u0641\u0629';
            const startIndex = pageText.indexOf(tafaseel);
            if (startIndex !== -1) description = pageText.substring(startIndex + 15, startIndex + 1000).trim();
        }

        let requirements = '';
        const reqMatch = pageText.match(new RegExp('\u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0648\u0638\u064A\u0641\u0629\\s*(.*?)(?:\u0645\u0645\u064A\u0632\u0627\u062A \u0627\u0644\u0648\u0638\u064A\u0641\u0629|\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0648\u0638\u064A\u0641\u0629|\u062A\u0642\u062F\u0645 \u0644\u0644\u0648\u0638\u064A\u0641\u0629)'));
        if (reqMatch) requirements = reqMatch[1].trim();

        // 1000% Bulletproof final fallback
        let finalCompany = partialJob.company_name || '';
        if (!finalCompany || finalCompany.includes('\u063A\u064A\u0631 \u0645\u062D\u062F\u062F') || finalCompany.includes('غير محدد') || finalCompany.includes('تصفح الشركات') || finalCompany.trim() === '') {
            finalCompany = 'شركة غير معلنة';
        }

        let finalLocation = partialJob.location;
        if (!finalLocation || finalLocation.trim() === '') {
            finalLocation = '\u0645\u0635\u0631';
        }

        return {
            source_job_id: jobId,
            url: partialJob.url,
            title: partialJob.title,
            company_name: finalCompany,
            company_url: '',
            location: finalLocation,
            posted_time: partialJob.posted_time || '',
            logo_url: partialJob.logo_url,
            job_type: partialJob.job_type || 'Not Specified',
            work_type: 'Not Specified', 
            experience_needed: experience,
            career_level: careerLevel,
            education_level: education,
            salary: partialJob.salary || 'Not Specified',
            job_categories: partialJob.job_categories || null,
            skills: 'Not Specified',
            description,
            requirements,
            job_status: 'Open',
            open_positions: 1, 
            applicants: applicants,
            viewed: viewed,
            in_consideration: 0,
            not_selected: 0,
            scraped_at: partialJob.scraped_at
        };
    }
}
