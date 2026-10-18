import { Client } from 'pg';
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import * as fs from 'fs';

// Reuse TCP connections with Keep-Alive for massive latency and CPU reduction
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 10000 });

const httpClient = axios.create({
    httpAgent,
    httpsAgent,
    timeout: 10000,
});

const dbConfig = { 
    user: process.env.DB_USER || 'egypt_jobs', 
    host: process.env.DB_HOST || 'localhost', 
    database: process.env.DB_NAME || 'egypt_jobs_db', 
    password: process.env.DB_PASSWORD || 'egypt_jobs_2026', 
    port: parseInt(process.env.DB_PORT || '5432', 10)
};

// ============================================================================
//                         SOURCE CHECKERS
// ============================================================================

async function checkWuzzuf(url: string, source_job_id: string): Promise<boolean> {
    try {
        const apiUrl = 'https://wuzzuf.net/api/job/' + source_job_id;
        const res = await httpClient.get(apiUrl, { timeout: 8000 });
        
        // Wuzzuf returns 200 OK for expired jobs, but with a specific status field
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

async function checkLinkedIn(url: string, source_job_id?: string, retryCount = 0): Promise<boolean> {
    try {
        // Use lightweight guest API if source_job_id is available (18KB vs 215KB)
        const targetUrl = source_job_id && /^\d+$/.test(source_job_id)
            ? `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${source_job_id}`
            : url;

        const response = await httpClient.get(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 10000,
            validateStatus: (s) => s < 500
        });

        if (response.status === 404 || response.status === 410) return true;
        if (response.status === 429) {
            if (retryCount < 1) {
                console.log('\n[LinkedIn] ⚠️ Rate limit (HTTP 429) hit. Pausing 6s and retrying...');
                await new Promise(r => setTimeout(r, 6000));
                return checkLinkedIn(url, source_job_id, retryCount + 1);
            }
            return false;
        }

        const html = response.data;
        if (typeof html === 'string') {
            // 1. Explicit text check (handles "No longer accepting applications", "Not currently accepting applications", etc.)
            if (
                /(?:no longer|not currently|not)\s+accepting applications/i.test(html) ||
                /(?:this job is closed|job is closed|closed-job|closed-job__flavor)/i.test(html)
            ) {
                return true;
            }

            // 2. Structural indicator: in guest API, closed jobs completely lack apply buttons/links
            if (targetUrl.includes('/jobs-guest/jobs/api/jobPosting/')) {
                const isValidCard = html.includes('top-card-layout') || html.includes('topcard__title');
                const hasApplyCta = html.includes('apply-button') || 
                                    html.includes('apply-link') || 
                                    html.includes('sign-in-modal__outlet-btn');
                
                // If it's a valid job page but there is NO way to apply, it's closed!
                if (isValidCard && !hasApplyCta) {
                    return true;
                }
            }
        }
        return false;
    } catch (e: any) {
        if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
        return false;
    }
}

async function checkIndeed(url: string): Promise<boolean> {
    try {
        const response = await httpClient.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000,
            validateStatus: (s) => s < 500
        });
        if (response.status === 404 || response.status === 410) return true;
        const html = response.data;
        if (typeof html === 'string' && (html.includes('This job has expired') || html.includes('No longer available'))) return true;
        return false;
    } catch (e: any) {
        if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
        return false;
    }
}

async function checkForasna(url: string): Promise<boolean> {
    try {
        const response = await httpClient.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000,
            validateStatus: (s) => s < 500
        });
        if (response.status === 404 || response.status === 410) return true;
        const html = response.data;
        if (typeof html === 'string' && (html.includes('هذه الوظيفة مغلقة') || html.includes('تم إغلاق') || html.includes('Job is closed'))) return true;
        return false;
    } catch (e: any) {
        if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
        return false;
    }
}

async function checkGlassdoor(url: string): Promise<boolean> {
    try {
        const response = await httpClient.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000,
            validateStatus: (s) => s < 500
        });
        if (response.status === 404 || response.status === 410) return true;
        const html = response.data;
        if (typeof html === 'string' && (
            html.includes('No longer accepting applications') ||
            html.includes('This job has expired') ||
            html.includes('Job is no longer available') ||
            html.includes('404 Not Found')
        )) return true;
        return false;
    } catch (e: any) {
        if (e.response && (e.response.status === 404 || e.response.status === 410)) return true;
        return false;
    }
}

// ============================================================================
//                         BAYT BROWSER ENGINE (FAST)
// ============================================================================

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

let globalContext: any = null;
let browserLaunchPromise: Promise<any> | null = null;

async function getBrowserContext() {
    if (globalContext) return globalContext;
    if (browserLaunchPromise) {
        return browserLaunchPromise;
    }

    browserLaunchPromise = (async () => {
        const userDataDir = path.join(__dirname, '..', 'browser_session');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        // Persistent context acts like a real browser with saved Cloudflare cookies
        globalContext = await chromium.launchPersistentContext(userDataDir, { 
            headless: false,
            args: ['--window-position=0,0', '--window-size=400,400']
        });
        return globalContext;
    })();

    return browserLaunchPromise;
}

async function checkBaytWithBrowser(url: string): Promise<{ isClosed: boolean, expectedCloseDate: string | null }> {
    const context = await getBrowserContext();
    const page = await context.newPage();
    try {
        // FAST: Abort heavy assets (images, media) to save 80% bandwidth & speed up page load 5x
        await page.route('**/*', (route: any) => {
            const resourceType = route.request().resourceType();
            if (['image', 'media'].includes(resourceType)) {
                return route.abort();
            }
            return route.continue();
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        
        // Wait up to 10 seconds only if Cloudflare challenge is active
        try {
            const title = await page.title();
            if (title.includes('Just a moment') || title.includes('Cloudflare')) {
                await page.waitForFunction(() => !document.title.includes('Just a moment') && !document.title.includes('Cloudflare'), { timeout: 10000 });
            }
        } catch(e) {}
        
        // Quick settle (reduced from 2000ms down to 400ms)
        await page.waitForTimeout(400);
        
        const html = await page.content();
        
        const isClosed = html.includes('no longer available') || 
                         html.includes('Job Expired') || 
                         html.includes('role has been filled') ||
                         html.includes('no longer accepting applications') ||
                         html.includes('Expired or no longer accepting applications');
        
        let expectedCloseDate: string | null = null;
        if (!isClosed) {
            const match = html.match(/Application closes in\s+(\d+)\s+days/i);
            if (match && match[1]) {
                const days = parseInt(match[1], 10);
                const closeDate = new Date();
                closeDate.setDate(closeDate.getDate() + days);
                expectedCloseDate = closeDate.toISOString().split('T')[0]; // YYYY-MM-DD
            }
        }
        
        await page.close();
        return { isClosed, expectedCloseDate };
    } catch (e) {
        console.log(`\n[Bayt Browser] Error checking URL: ${url}`);
        await page.close().catch(() => {});
        return { isClosed: false, expectedCloseDate: null };
    }
}

async function checkBayt(url: string): Promise<{ isClosed: boolean, expectedCloseDate: string | null }> {
    return await checkBaytWithBrowser(url);
}

// ============================================================================
//              SMART WORKER POOL & DATABASE BATCH UPDATER
// ============================================================================

interface SourceSettings {
    concurrency: number;
    delayBetweenMs: [number, number];
    staggerMs: number;
}

const SETTINGS_PER_SOURCE: Record<string, SourceSettings> = {
    Wuzzuf:    { concurrency: 12, delayBetweenMs: [30, 80],   staggerMs: 50 },
    Forasna:   { concurrency: 8,  delayBetweenMs: [40, 90],   staggerMs: 80 },
    LinkedIn:  { concurrency: 3,  delayBetweenMs: [250, 450], staggerMs: 350 },
    Indeed:    { concurrency: 4,  delayBetweenMs: [150, 300], staggerMs: 150 },
    Bayt:      { concurrency: 2,  delayBetweenMs: [250, 400], staggerMs: 800 },
    Glassdoor: { concurrency: 4,  delayBetweenMs: [150, 300], staggerMs: 200 },
    Tanqeeb:   { concurrency: 6,  delayBetweenMs: [100, 200], staggerMs: 150 },
};

async function flushOpenJobUpdates(client: Client, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
        await client.query("UPDATE jobs SET updated_at = NOW() WHERE id = ANY($1)", [ids]);
    } catch (err: any) {
        console.error('\n[DB Error] Failed to batch update open jobs:', err.message);
    }
}

async function processSourceJobs(client: Client, source: string, jobs: any[]): Promise<number> {
    if (jobs.length === 0) return 0;

    const settings = SETTINGS_PER_SOURCE[source] || { concurrency: 4, delayBetweenMs: [100, 200], staggerMs: 100 };
    console.log(`\n--- Processing [${source}] (${jobs.length} jobs) with concurrency ${settings.concurrency} ---`);

    let closedCount = 0;
    let completedCount = 0;
    let openIdsBuffer: string[] = [];

    let currentIndex = 0;
    const workerCount = Math.min(settings.concurrency, jobs.length);

    const workers = Array.from({ length: workerCount }, async (_, workerId) => {
        // Stagger initial start of workers to prevent sudden request bursts
        if (workerId > 0 && settings.staggerMs > 0) {
            await new Promise(r => setTimeout(r, workerId * settings.staggerMs));
        }

        while (currentIndex < jobs.length) {
            const index = currentIndex++;
            if (index >= jobs.length) break;

            const job = jobs[index];
            let isClosed = false;
            let expectedCloseDate: string | null = null;

            try {
                if (job.source === 'Wuzzuf') {
                    isClosed = await checkWuzzuf(job.job_url, job.source_job_id);
                } else if (job.source === 'LinkedIn') {
                    isClosed = await checkLinkedIn(job.job_url, job.source_job_id);
                } else if (job.source === 'Indeed') {
                    isClosed = await checkIndeed(job.job_url);
                } else if (job.source === 'Forasna') {
                    isClosed = await checkForasna(job.job_url);
                } else if (job.source === 'Bayt') {
                    const result = await checkBayt(job.job_url);
                    isClosed = result.isClosed;
                    expectedCloseDate = result.expectedCloseDate;
                } else if (job.source === 'Glassdoor') {
                    isClosed = await checkGlassdoor(job.job_url);
                }

                if (isClosed) {
                    console.log(`\n❌ [CLOSED] [${job.source}] ${job.job_url}`);
                    await client.query("UPDATE jobs SET status = 'Closed', updated_at = NOW() WHERE id = $1", [job.id]);
                    closedCount++;
                } else {
                    if (expectedCloseDate) {
                        await client.query("UPDATE jobs SET expected_close_date = $1, updated_at = NOW() WHERE id = $2", [expectedCloseDate, job.id]);
                        console.log(`\n📅 [DATE SCRAPED] [${job.source}] ${job.job_url} -> Closes on ${expectedCloseDate}`);
                    }
                    openIdsBuffer.push(job.id);
                    if (openIdsBuffer.length >= 50) {
                        const toFlush = [...openIdsBuffer];
                        openIdsBuffer = [];
                        await flushOpenJobUpdates(client, toFlush);
                    }
                }
            } catch (err: any) {
                console.error(`\nError checking ${job.job_url}:`, err.message);
            }

            completedCount++;
            process.stdout.write(`\r[${source}] Checked ${completedCount} / ${jobs.length} jobs (Closed: ${closedCount})... `);

            // Micro-jitter between consecutive requests of the same worker
            const [minD, maxD] = settings.delayBetweenMs;
            const jitter = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
            await new Promise(r => setTimeout(r, jitter));
        }
    });

    await Promise.all(workers);

    // Flush any remaining buffered open IDs
    if (openIdsBuffer.length > 0) {
        await flushOpenJobUpdates(client, openIdsBuffer);
    }

    console.log(`\n✅ [${source}] Finished! Marked ${closedCount} jobs as Closed.`);
    return closedCount;
}

// ============================================================================
//                               MAIN
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1]
                   || (args.indexOf('--source') !== -1 ? args[args.indexOf('--source') + 1] : null);
    const targetSource = sourceArg ? sourceArg.trim() : null;

    const staleOnly = args.includes('--stale-only');
    const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
                  || (args.indexOf('--limit') !== -1 ? args[args.indexOf('--limit') + 1] : null);
    const limit = limitArg ? parseInt(limitArg, 10) : null;

    const label = targetSource ? `[${targetSource}]` : '[ALL SOURCES]';
    console.log('================================================');
    console.log(`   Database Job Status Checker ${label} (Turbo Edition)`);
    console.log('================================================');
    if (staleOnly) console.log('⚡ Filter: Checking only stale jobs (> 12 hours since last check)');

    const client = new Client(dbConfig);
    await client.connect();

    // Query open jobs
    const query = `
        SELECT id, source, source_job_id, job_url 
        FROM jobs 
        WHERE status = 'Open' 
        AND (expected_close_date IS NULL OR expected_close_date <= CURRENT_DATE)
        ${targetSource ? `AND source = '${targetSource}'` : ''}
        ${staleOnly ? `AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '12 hours')` : ''}
        ORDER BY updated_at ASC NULLS FIRST, posted_date DESC
        ${limit ? `LIMIT ${limit}` : ''}
    `;

    const res = await client.query(query);
    const jobs = res.rows;
    console.log(`Found ${jobs.length} Open jobs to check in the database.`);

    if (jobs.length === 0) {
        console.log('No open jobs matching the criteria. All up to date!');
        await client.end();
        return;
    }

    let totalClosed = 0;

    if (targetSource) {
        // Single source run
        totalClosed = await processSourceJobs(client, targetSource, jobs);
    } else {
        // Group jobs by source and process each source with its optimal engine
        const sourcesInOrder = ['Wuzzuf', 'Forasna', 'LinkedIn', 'Indeed', 'Bayt', 'Glassdoor', 'Tanqeeb'];
        for (const src of sourcesInOrder) {
            const srcJobs = jobs.filter(j => j.source === src);
            if (srcJobs.length > 0) {
                const closed = await processSourceJobs(client, src, srcJobs);
                totalClosed += closed;
            }
        }
        // Catch any remaining sources not in the list
        const otherJobs = jobs.filter(j => !sourcesInOrder.includes(j.source));
        if (otherJobs.length > 0) {
            const closed = await processSourceJobs(client, 'Other', otherJobs);
            totalClosed += closed;
        }
    }

    console.log(`\n================================================`);
    console.log(`🎉 Finished All! Total marked Closed: ${totalClosed}`);
    console.log(`================================================`);

    await client.end();
    if (globalContext) {
        await globalContext.close();
    }
}

main().catch(console.error);
