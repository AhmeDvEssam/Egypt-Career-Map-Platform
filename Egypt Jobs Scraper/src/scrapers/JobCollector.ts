import { BaseScraper } from '../core/BaseScraper';
import { IScraper, JobEntity } from '../core/ScraperInterface';
import * as fs from 'fs';
import { categorizeJob } from '../utils/CategoryMapper';
import * as path from 'path';
import { normalizeUrl } from '../utils/normalize';
import { DatabaseSync } from '../utils/DatabaseSync';

export interface CollectionStats {
    newJobs: number;
    scannedPages: number;
    stoppedReason: 'COMPLETED' | 'SMART_STOP' | 'ERROR' | 'NETWORK_FAIL';
}

export class JobCollector {
    private scraper: BaseScraper;
    private csvPath: string;
    private processedUrls: Set<string>;
    private saveLock = false;

    constructor(scraper: BaseScraper, csvPath: string) {
        this.scraper = scraper;
        this.csvPath = csvPath;
        this.processedUrls = new Set<string>();
        this.ensureDirectory();
        this.validateHeaders();
        this.loadProcessedUrls();
    }

    private validateHeaders() {
        if (!fs.existsSync(this.csvPath)) return;

        try {
            const fileContent = fs.readFileSync(this.csvPath, 'utf-8');
            const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
            if (lines.length === 0) return;

            const firstLine = lines[0].trim().replace(/^\uFEFF/, '');
            const currentHeaders = this.scraper.getHeaders().join(',');

            let isCorrupt = false;
            let reason = '';

            // 1. Header Mismatch Check (RELAXED FOR USER BACKUP)
            if (firstLine !== currentHeaders) {
                // isCorrupt = true; // DISABLE STRICT CHECK
                console.warn('[Collector] Notice: CSV Header differs from Scraper standard. Proceeding with existing file structure.');
                // reason = 'Header Mismatch';
            }
            // 2. Data Content Check (Aggressive)
            else if (lines.length > 1) {
                const headerCols = firstLine.split(',');
                const idIndex = headerCols.indexOf('Job Id');

                if (idIndex > -1) {
                    // Check up to 10 rows
                    for (let i = 1; i < Math.min(lines.length, 11); i++) {
                        const rowCols = this.parseCSVLine(lines[i]);
                        const idVal = rowCols[idIndex];
                        // Heuristic: If ID looks like a standard word "Accountant", "Engineer" (and not alphanumeric ID), flag it.
                        // Real IDs: "4341068993", "Some-Slug-123"
                        // Bad Data: "Sales Manager"
                        if (idVal && !/\d/.test(idVal) && /^[A-Z][a-z]+/.test(idVal) && idVal.includes(' ')) {
                            isCorrupt = true;
                            reason = `Detected text "${idVal}" in Job ID column at row ${i + 1}`;
                            break;
                        }
                        if (rowCols.length !== headerCols.length) {
                            if (Math.abs(rowCols.length - headerCols.length) > 2) {
                                isCorrupt = true;
                                reason = `Column count mismatch at row ${i + 1} (Expected ${headerCols.length}, Found ${rowCols.length})`;
                                break;
                            }
                        }
                    }
                }
            }

            if (isCorrupt) {
                console.warn(`[Collector] ⚠️ CSV Corruption Detected! Reason: ${reason}`);
                const backupPath = this.csvPath.replace('.csv', `_backup_${Date.now()}.csv`);
                console.warn(`[Collector] 📦 Archiving corrupt file to: ${backupPath}`);

                fs.renameSync(this.csvPath, backupPath);
                fs.writeFileSync(this.csvPath, '\uFEFF' + currentHeaders + '\n');
            }
        } catch (e) {
            console.error('[Collector] Error validating headers', e);
        }
    }

    private parseCSVLine(line: string): string[] {
        const columns: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { columns.push(current); current = ''; }
            else { current += char; }
        }
        columns.push(current);
        return columns.map(c => {
            let val = c.trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
            return val.trim();
        });
    }

    private ensureDirectory() {
        const dir = path.dirname(this.csvPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private loadProcessedUrls() {
        this.processedUrls.clear();
        let fileIsPopulated = false;

        if (fs.existsSync(this.csvPath)) {
            const content = fs.readFileSync(this.csvPath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            
            if (lines.length > 0) {
                fileIsPopulated = true;
                const header = lines[0];
                const cols = header.split(',');
                let idIdx = cols.findIndex(c => c.includes('Job Id'));
                if (idIdx === -1) idIdx = 0;

                // Dynamically find the URL index instead of hardcoding 12
                let urlIdx = cols.findIndex(c => c.toLowerCase().includes('url'));
                if (urlIdx === -1) urlIdx = 12; // Fallback to 12 if not found

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    try {
                        const parsedCols = this.parseCSVLine(line);

                        // Use the dynamically found URL index
                        const url = parsedCols[urlIdx] || '';
                        if (url && url.length > 10) {
                            const cleanUrl = normalizeUrl(url);
                            if (cleanUrl) this.processedUrls.add(cleanUrl);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        }

        if (!fileIsPopulated) {
            const headers = this.scraper.getHeaders();
            fs.writeFileSync(this.csvPath, '\uFEFF' + headers.join(',') + '\n');
        }
        console.log(`[Collector] Loaded ${this.processedUrls.size} known Job IDs.`);
    }

    public getKnownIds(): Set<string> {
        return this.processedUrls;
    }


    private extractId(url: string): string | null {
        if (!url) return null;
        if (url.includes('wuzzuf.net')) {
            const match = url.match(/\/(?:p|internship)\/([a-zA-Z0-9-]+)\b/);
            return match ? match[1] : null;
        }
        if (url.includes('linkedin.com')) {
            const match = url.match(/(\d{8,})/);
            return match ? match[1] : null;
        }
        return null;
    }

    public async runCycle(): Promise<CollectionStats> {
        let newJobsCount = 0;
        let pagesScanned = 0;
        let consecutiveDuplicateBatches = 0;
        let stoppedReason: CollectionStats['stoppedReason'] = 'COMPLETED';
        let consecutiveFailedPages = 0;

        console.log('[Collector] Starting Cycle...');

        // 1. Fetch Total to determine Smart Limit
        let totalJobs = 0;
        try {
            totalJobs = await this.scraper.fetchTotalJobs();
            console.log(`[Collector] Total Estimated Jobs: ${totalJobs}`);
        } catch (e) {
            console.warn('[Collector] Could not fetch total, using default...');
            totalJobs = 1000;
        }

        // 2. Calculate Page Limit
        const pageSize = this.scraper.defaultPageSize || 15;
        const expectedPages = Math.ceil(totalJobs / pageSize);
        // SAFETY: Increased buffer from +5 to +10 to ensure we catch everything even if data shifts
        const HARD_PAGE_LIMIT = Math.max(expectedPages + 10, 20);

        // 3. Dynamic Duplicate Limit
        const DYNAMIC_DUPLICATE_LIMIT = 1000; // FORCE DEEP SCAN (Was: Math.min...)

        console.log(`[Collector] Smart Page Limit: ${HARD_PAGE_LIMIT} pages`);
        console.log(`[Collector] Smart Duplicate Limit: ${DYNAMIC_DUPLICATE_LIMIT} batches`);

        // 4. Load IDs
        this.loadProcessedUrls();

        // 5. Load State for Pause/Resume
        const { StateTracker } = require('../utils/StateTracker');
        const stateTracker = new StateTracker(this.scraper.name.toLowerCase());
        let page = stateTracker.getLastProgress('global_scan');
        
        if (page > 0) {
            console.log(`[Collector] ⏭️ RESUMING from Page ${page} based on previous state...`);
        }

        while (true) {
            // STOP CONDITION: Page Limit
            if (page > HARD_PAGE_LIMIT) {
                console.log(`[Collector] 🛑 Reached Smart Page Limit (${HARD_PAGE_LIMIT}). Stopping.`);
                break;
            }

            stateTracker.updateKeywordProgress('global_scan', page);

            try {
                // Scrape
                let result: any = null;
                let retries = 0;
                while (retries < 3) {
                    try {
                        result = await this.scraper.scrapeSpecificPage(page, this.processedUrls);
                        console.log(`[Page ${page + 1}] Raw Cards Found: ${result.foundCards}`);
                        
                        if (result.foundCards > 0 || result.jobs.length > 0) {
                            break;
                        }
                        
                        console.log(`[Page ${page + 1}] ⚠️ WARNING: 0 Cards found! (Possible Block)`);
                    } catch (err: any) {
                        console.error(`[Page ${page + 1}] Exception: ${err.message}`);
                    }
                    
                    // Always retry, regardless of the page number, because Cloudflare can block midway.
                    console.warn(`[Page ${page + 1}] Retrying... (${retries + 1}/3) in 15s`);
                    await new Promise(r => setTimeout(r, 15000));
                    retries++;
                }

                pagesScanned++;

                if (!result || (result.foundCards === 0 && result.jobs.length === 0)) {
                    consecutiveFailedPages++;
                    console.log(`[Collector] ⚠️ Page ${page + 1} returned 0 results after retries. Skipping... (${consecutiveFailedPages}/3 consecutive failures)`);
                    if (consecutiveFailedPages >= 3) {
                        console.log(`[Collector] 🛑 Stopped: 3 consecutive pages returned 0 results.`);
                        break;
                    }
                    page++;
                    await new Promise(r => setTimeout(r, 15000)); // Wait longer before trying next page
                    continue;
                }
                consecutiveFailedPages = 0; // Reset on success

                // Filter and Save New Jobs instantly
                const newEntities: JobEntity[] = [];
                for (const job of result.jobs) {
                    const cleanJobUrl = normalizeUrl(job.url);
                    if (cleanJobUrl && !this.processedUrls.has(cleanJobUrl)) {
                        newEntities.push(job);
                        this.processedUrls.add(cleanJobUrl);
                        
                        // SAVE INSTANTLY
                        await this.saveJobs([job]);
                    }
                }

                if (newEntities.length > 0) {
                    console.log(`[Collector] Found and Saved ${newEntities.length} NEW jobs at Page ${page + 1}`);
                    newJobsCount += newEntities.length;
                    consecutiveDuplicateBatches = 0;
                } else {
                    consecutiveDuplicateBatches++;
                    if (consecutiveDuplicateBatches % 5 === 0) {
                        process.stdout.write(`... [Page ${page + 1} Clean] ..`);
                    }
                }

                // STOP CONDITION: Duplicates
                if (consecutiveDuplicateBatches >= DYNAMIC_DUPLICATE_LIMIT) {
                    console.log(`\n[Collector] 🛑 Smart Stop: 0 new jobs for ${consecutiveDuplicateBatches} pages.`);
                    stoppedReason = 'SMART_STOP';
                    break;
                }

                page++;
                // Longer delay between pages to prevent 429 rate limiting
                console.log(`[Collector] ⏳ Waiting 2.5s before next page...`);
                await new Promise(r => setTimeout(r, 2500));

            } catch (e: any) {
                if (e.message && e.message.includes('Loop Detected')) {
                    console.log(`\n[Collector] 🛑 ${e.message}`);
                    stoppedReason = 'COMPLETED'; // We scanned all real pages
                    break;
                }
                console.error(`[Collector] Error page ${page}: ${e.message}`);
                stoppedReason = 'ERROR';
                // Don't break on single error, retry next page
                page++;
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        // Only clear state if we completed successfully (not blocked/errored mid-run)
        if (stoppedReason === 'COMPLETED' || stoppedReason === 'SMART_STOP') {
            stateTracker.clearCompleted();
            console.log('[Collector] State cleared (completed successfully).');
        } else {
            console.log(`[Collector] State PRESERVED (stopped due to ${stoppedReason}). Resume will continue from page ${page + 1}.`);
        }

        return {
            newJobs: newJobsCount,
            scannedPages: pagesScanned,
            stoppedReason
        };
    }




    public async saveJobs(newJobs: JobEntity[]) {

        if (newJobs.length === 0) return;

        // Wait for lock
        let retries = 0;
        while (this.saveLock) {
            if (retries > 20) {
                console.log('[Collector] Save Lock Timeout. Skipping save to prevent deadlock.');
                return;
            }
            await new Promise(r => setTimeout(r, 200));
            retries++;
        }

        this.saveLock = true;

        try {
            let fileContent = '';
            if (fs.existsSync(this.csvPath)) {
                // Check if file ends with newline
                const fd = fs.openSync(this.csvPath, 'r');
                const stat = fs.fstatSync(fd);
                if (stat.size > 0) {
                    const buffer = Buffer.alloc(1);
                    fs.readSync(fd, buffer, 0, 1, stat.size - 1);
                    if (buffer.toString() !== '\n') {
                        fileContent = '\n'; // Prepend newline to the new content
                    }
                }
                fs.closeSync(fd);
            } else {
                fileContent = '\uFEFF' + this.scraper.getHeaders().join(',') + '\n';
            }

            const headerMap = this.scraper.getHeaders();
            const linesToAppend: string[] = [];

            for (const job of newJobs) {
                // Sync Live to PostgreSQL Database
                try {
                    let source = (this.scraper as any).name || 'Wuzzuf';
                    if (job.url.includes('linkedin.com')) source = 'LinkedIn';
                    else if (job.url.includes('indeed.com')) source = 'Indeed';
                    else if (job.url.includes('forasna.com')) source = 'Forasna';
                    else if (job.url.includes('bayt.com')) source = 'Bayt';
                    else if (job.url.includes('glassdoor.com')) source = 'Glassdoor';
                    else if (job.url.includes('tanqeeb.com')) source = 'Tanqeeb';
                    await DatabaseSync.upsertJob(job, source);
                } catch (dbErr: any) {
                    console.error('[JobCollector] DB Sync failed:', dbErr.message);
                    // Fail silently so it doesn't break the CSV loop
                }

                // ... map logic ...
                const row = headerMap.map(header => {
                    let value = this.mapHeaderToValue(header, job) || '';
                    // ... sanitization ...
                    value = value.toString();
                    value = value.replace(/[\r\n]+/g, ' ');
                    value = value.replace(/\s+/g, ' ').trim();
                    value = value.replace(/"/g, '""');
                    return `"${value}"`;
                }).join(',');
                linesToAppend.push(row);
            }

            if (linesToAppend.length > 0) {
                // Final Retry Loop for Append
                let saved = false;
                let saveRetries = 0;
                while (!saved && saveRetries < 5) {
                    try {
                        const contentToWrite = (fileContent === '\n' ? '\n' : '') + linesToAppend.join('\n') + '\n';
                        fs.appendFileSync(this.csvPath, contentToWrite);
                        saved = true;
                    } catch (e: any) {
                        if (e.code === 'EBUSY' || e.code === 'EPERM') {
                            await new Promise(r => setTimeout(r, 1000 * (saveRetries + 1))); // Expectational Backoff
                            saveRetries++;
                        } else {
                            throw e;
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('[Collector] Error saving CSV:', e);
        } finally {
            this.saveLock = false;
        }
    }

    private mapHeaderToValue(header: string, job: any): string {
        const map: { [key: string]: string } = {
            'Job Id': 'source_job_id',
            'Scraping Date': 'scraped_at',
            'Job Title': 'title',
            'Company Name': 'company_name',
            'Location': 'location',
            'Job Type': 'job_type',
            'Work Type': 'work_type',
            'Experience Needed': 'experience_needed',
            'Career Level': 'career_level',
            'Education Level': 'education_level',
            'Salary': 'salary',
            'Job Categories': 'job_categories',
            'Skills': 'skills',
            'Posted Time': 'posted_time',
            'Job URL': 'url',
            'Company URL': 'company_url',
            'Logo': 'logo_url',
            'Description': 'description',
            'Requirements': 'requirements',
            'Job Status': 'job_status',
            'Applicants': 'applicants',
            'Open Positions': 'open_positions',
            'Viewed': 'viewed',
            'In Consideration': 'in_consideration',
            'Not Selected': 'not_selected',
            'Internal Category': 'internal_category',
            // LinkedIn Expansion
            'Industry': 'industry',
            'Employment Type': 'employment_type', // Consolidate
            'Valid Through': 'valid_through',
            'Recruiter': 'recruiter_name',
            'Source': 'source',
            'Work Mode': 'work_mode',
            'Job Function': 'job_function',
            'Experience Level': 'experience_level',
            'Easy Apply': 'easy_apply'
        };

        const key = map[header];
        
        if (header === 'Internal Category') return categorizeJob(job['title'] || '');

        if (key) return job[key]; // Return if found (undefined is fine, will be empty string)

        // Special case: 'Job Type' -> employment_type if not found
        if (header === 'Job Type') return job['employment_type'] || job['job_type'];

        // Fallback: snake_case
        const simpleKey = header.toLowerCase().replace(/ /g, '_');
        if (job[simpleKey] !== undefined) return job[simpleKey];

        return '';
    }
}
