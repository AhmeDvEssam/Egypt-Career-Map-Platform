import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { IndeedQueryPlanner, QuerySpec } from './IndeedQueryPlanner';
import { IndeedSearchParser, SearchJob } from './IndeedSearchParser';
import { IndeedJobDetailParser, JobDetailResult } from './IndeedJobDetailParser';
import { BlockDetector } from './BlockDetector';
import { StateStore, RetryJob } from './StateStore';
import { CsvSink, JobRecord } from './sinks/CsvSink';
import { DbSink } from './sinks/DbSink';
import { MetricsReporter } from './metrics/MetricsReporter';
import { DebugDumper } from './debug/DebugDumper';
import { IndeedPythonWorker } from './IndeedPythonWorker';

const BASE_URL = 'https://eg.indeed.com';
const LEGACY_CSV_PATH = path.resolve(__dirname, '../../../data/indeed_clean_data.csv');
const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../data/indeed_jobs.csv');
const ENV_CSV_PATH = process.env.INDEED_CSV_PATH;
const ENV_STATE_PATH = process.env.INDEED_STATE_PATH;
const CSV_PATH = ENV_CSV_PATH
    ? (path.isAbsolute(ENV_CSV_PATH)
        ? ENV_CSV_PATH
        : path.resolve(process.cwd(), ENV_CSV_PATH))
    : (fs.existsSync(LEGACY_CSV_PATH) ? LEGACY_CSV_PATH : DEFAULT_CSV_PATH);
const DEFAULT_STATE_PATH = path.resolve(__dirname, '../../../data/indeed_state.json');
const STATE_PATH = ENV_STATE_PATH
    ? (path.isAbsolute(ENV_STATE_PATH)
        ? ENV_STATE_PATH
        : path.resolve(process.cwd(), ENV_STATE_PATH))
    : DEFAULT_STATE_PATH;
const DEBUG_DIR = path.resolve(__dirname, '../../../debug/indeed');
const LOG_PATH = path.resolve(__dirname, '../../../logs/indeed_block_events.jsonl');
const SESSION_DIR = path.resolve(__dirname, '../../../data/indeed_session');

const PAGE_SIZE = parseInt(process.env.PAGE_SIZE || '10', 10);
const MAX_EMPTY_PAGES = parseInt(process.env.MAX_EMPTY_PAGES || '3', 10);
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
const NORMAL_DELAY_MS = parseInt(process.env.NORMAL_DELAY_MS || '1000', 10);
const POLITE_DELAY_MS = parseInt(process.env.POLITE_DELAY_MS || '5000', 10);
const DETAIL_DELAY_MS = parseInt(process.env.DETAIL_DELAY_MS || '800', 10);
const DETAIL_BLOCK_RETRIES = parseInt(process.env.DETAIL_BLOCK_RETRIES || '2', 10);
const DETAIL_BLOCK_BACKOFF_BASE_MS = parseInt(process.env.DETAIL_BLOCK_BACKOFF_BASE_MS || '20000', 10);
const RETRY_BACKOFF_BASE_MS = parseInt(process.env.RETRY_BACKOFF_BASE_MS || '600000', 10);
const MAX_DEFERRED_ATTEMPTS = parseInt(process.env.MAX_DEFERRED_ATTEMPTS || '3', 10);
const MAX_DEFERRED_WAIT_MS = parseInt(process.env.MAX_DEFERRED_WAIT_MS || '60000', 10);
const MAX_DEFERRED_CYCLES = parseInt(process.env.MAX_DEFERRED_CYCLES || '6', 10);
const DRY_RUN = process.env.DRY_RUN === '1';
const LIMIT_PAGES = parseInt(process.env.LIMIT_PAGES || (DRY_RUN ? '2' : '0'), 10);
const WARMUP_DELAY_MS = parseInt(process.env.WARMUP_DELAY_MS || '5000', 10);
const DESCRIPTION_MIN_LENGTH = parseInt(process.env.DESCRIPTION_MIN_LENGTH || '50', 10);
const DEFAULT_USER_AGENT = process.env.INDEED_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const INDEED_HEADLESS = process.env.INDEED_HEADLESS !== '0';
const INDEED_WARMUP_INTERACTIVE = process.env.INDEED_WARMUP_INTERACTIVE === '1';
const INDEED_FETCH_MODE = (process.env.INDEED_FETCH_MODE || 'auto').toLowerCase();
const MAX_JOBS_PER_QUERY = parseInt(process.env.INDEED_MAX_JOBS_PER_QUERY || '0', 10);

type FetchMode = 'auto' | 'browser' | 'python';

interface DetailFetchOutcome {
    detail: JobDetailResult;
    blocked: boolean;
    invalid: boolean;
}

interface RunQueryResult {
    deferred: boolean;
    deferMs?: number;
    reason?: string;
}

interface DeferredQuery {
    query: QuerySpec;
    attempts: number;
    nextAttemptAt: number;
    reason: string;
}

/**
 * IndeedScraper — API-first with page fallback
 *
 * Key behaviors:
 * 1. Deterministic query grid (keyword x city x mode x pagination)
 * 2. API-first search fetch, page fallback on failure
 * 3. Detail fetch validates JobPosting schema to avoid honeypots
 * 4. Adaptive throttling via BlockDetector (no bypass logic)
 * 5. Crash-safe resume + retry queue with backoff
 */
export class IndeedScraper {
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private proxies: string[] = [];
    private currentProxyIndex = 0;
    private userAgent = DEFAULT_USER_AGENT;
    private descriptionMinLength = DESCRIPTION_MIN_LENGTH;
    private pythonWorker: IndeedPythonWorker | null = null;
    private fetchMode: FetchMode = 'auto';

    private planner = new IndeedQueryPlanner();
    private stateStore = new StateStore(STATE_PATH);
    private blockDetector = new BlockDetector(LOG_PATH);
    private sink = new CsvSink(CSV_PATH);
    private dbSink = new DbSink();
    private metrics = new MetricsReporter();
    private debugDumper = new DebugDumper(DEBUG_DIR);
    private knownKeys = new Set<string>();
    private deferredQueries = new Map<string, DeferredQuery>();

    constructor() {
        this.loadProxies();
        if (INDEED_FETCH_MODE === 'browser' || INDEED_FETCH_MODE === 'python') {
            this.fetchMode = INDEED_FETCH_MODE as FetchMode;
        } else {
            this.fetchMode = 'auto';
        }
    }

    // ─── Honeypot Detection ──────────────────────────────────────────
    // Indeed injects "trap" job cards with fake job keys to detect scrapers.
    // These keys are always 16 hex chars where each hex digit (0-F) appears
    // exactly once — a perfect permutation. Real job keys have repeated digits.
    // Examples: 890abcdef0123456, f1e2d3c4b5a67890, 0123456789abcdef
    static isHoneypotKey(key: string): boolean {
        if (!key || key.length < 16) return false;
        const k = key.toLowerCase();
        // Only flag keys that are exactly 16 hex chars
        if (!/^[a-f0-9]{16}$/.test(k)) return false;

        // Check if every hex digit 0-F appears exactly once (permutation)
        const seen = new Set(k.split(''));
        return seen.size === 16;
    }

    async scrape() {
        this.sink.init();
        if (DRY_RUN) {
            this.debugDumper.ensureRunFolder();
        }
        this.loadKnownKeysFromCsv();

        console.log(`🧭 Fetch mode: ${this.fetchMode}`);

        // ─── Python-Only Mode ──────────────────────────────────────
        // Playwright alone cannot bypass Cloudflare (gets 403 even with cookies).
        // Python UC (undetected-chromedriver) is the only reliable path.
        // Skip Playwright entirely — use Python UC for all browser operations.
        console.log('🐍 Starting Python UC (Cloudflare bypass)...');
        await this.ensurePythonWorker();

        const queries = this.planner.getQueries();
        let stoppedForGlobalCooldown = false;
        for (const query of queries) {
            if (this.blockDetector.isInCooldown(query.queryKey)) {
                const waitMs = this.blockDetector.getBucketCooldownRemainingMs(query.queryKey);
                this.deferQuery(query, waitMs, 'bucket_cooldown');
                continue;
            }

            if (this.blockDetector.isGlobalCooldown()) {
                console.log('⏳ Global cooldown active. Ending scheduling early.');
                stoppedForGlobalCooldown = true;
                break;
            }

            try {
                const result = await this.runQuery(query);
                if (result.deferred) {
                    if (result.reason === 'global_cooldown') {
                        console.log('⏳ Global cooldown triggered during query. Ending scheduling early.');
                        stoppedForGlobalCooldown = true;
                        break;
                    }
                    this.deferQuery(query, result.deferMs || 0, result.reason || 'cooldown');
                }
            } catch (e) {
                console.error(`❌ Query failed: ${query.queryKey}`, e);
                // Re-warmup on major failure
                await this.restartContext();
            }
        }

        if (!stoppedForGlobalCooldown) {
            await this.processDeferredQueries();
        }

        await this.processRetryQueue();
        this.stateStore.save();
        this.sink.close();

        const summary = this.metrics.summary();
        if (summary) {
            console.log('==================================================');
            console.log('📊 INDEED METRICS SUMMARY');
            console.log('==================================================');
            console.log(summary);
        }
    }

    async close() {
        this.stateStore.save();
        if (this.pythonWorker) {
            try { await this.pythonWorker.close(); } catch { }
            this.pythonWorker = null;
        }
        if (this.context) {
            try { await this.context.close(); } catch { }
        }
    }

    private loadProxies() {
        const proxyPath = path.join(process.cwd(), 'data', 'proxies.txt');
        if (!fs.existsSync(proxyPath)) return;
        const content = fs.readFileSync(proxyPath, 'utf-8');
        this.proxies = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        if (this.proxies.length > 0) {
            this.proxies.sort(() => Math.random() - 0.5);
            console.log(`🛡️ Loaded ${this.proxies.length} proxies for Indeed.`);
        }
    }

    private getNextProxy(): string | null {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentProxyIndex % this.proxies.length];
        this.currentProxyIndex += 1;
        return proxy;
    }

    // ─── Persistent Context Launch (LinkedIn-style) ───────────────────
    private async launch() {
        if (this.context) return;

        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        console.log(`📂 Session Dir: ${SESSION_DIR}`);

        const proxyServer = this.getNextProxy();
        if (proxyServer) {
            console.log(`🌍 Using Proxy: ${proxyServer}`);
        }

        this.context = await chromium.launchPersistentContext(SESSION_DIR, {
            headless: INDEED_HEADLESS,
            channel: 'chrome',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080',
                '--start-maximized',
            ],
            proxy: proxyServer ? { server: proxyServer } : undefined,
            userAgent: this.userAgent,
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            timezoneId: 'Africa/Cairo',
            javaScriptEnabled: true,
        });

        await this.context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // @ts-ignore
            window.navigator.chrome = { runtime: {} };
            // @ts-ignore
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            // @ts-ignore
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });

        await this.context.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });

        this.page = this.context.pages()[0] || await this.context.newPage();
        this.page.setDefaultTimeout(this.getNavigationTimeout());
        this.page.setDefaultNavigationTimeout(this.getNavigationTimeout());
    }

    private async warmup() {
        if (!this.page) return;
        try {
            console.log('🔥 Warming up: Navigating to home page...');
            const resp = await this.page.goto(BASE_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            });
            const status = resp?.status();
            console.log(`🏠 Home page status: ${status}`);

            if (INDEED_WARMUP_INTERACTIVE) {
                console.log('🖱️ Performing interactive search to build trust...');
                try {
                    const whatInput = await this.page.$('input[name="q"], input#text-input-what');
                    const whereInput = await this.page.$('input[name="l"], input#text-input-where');
                    const submitBtn = await this.page.$('button[type="submit"], .yosegi-InlineWhatWhere-primaryButton');

                    if (whatInput) {
                        await whatInput.click();
                        await this.page.keyboard.type('Jobs', { delay: 100 });
                        await this.sleep(500);
                    }

                    if (whereInput) {
                        await whereInput.click({ clickCount: 3 });
                        await this.page.keyboard.press('Backspace');
                        await this.page.keyboard.type('Egypt', { delay: 100 });
                        await this.sleep(500);
                    }

                    if (submitBtn) {
                        console.log('🖱️ Clicking search...');
                        await Promise.all([
                            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => { }),
                            submitBtn.click()
                        ]);
                        console.log('✅ Interactive search complete.');
                        await this.sleep(3000);
                    } else {
                        console.log('⚠️ Submit button not found, pressing Enter...');
                        await this.page.keyboard.press('Enter');
                        await this.sleep(5000);
                    }
                } catch (err) {
                    console.warn('⚠️ Interactive warmup partially failed:', (err as Error).message);
                }
            }

            await this.sleep(WARMUP_DELAY_MS);
        } catch (e) {
            console.warn('⚠️ Warmup navigation failed:', (e as Error).message);
        }
    }

    private async restartContext() {
        console.log('🔄 Restarting Python UC worker...');
        if (this.pythonWorker) {
            try { await this.pythonWorker.close(); } catch { }
            this.pythonWorker = null;
        }
        if (this.context) {
            try { await this.context.close(); } catch { }
            this.context = null;
            this.page = null;
        }
        await this.ensurePythonWorker();
    }

    // ─── Helpers ──────────────────────────────────────────────────────
    private getNavigationTimeout(): number {
        return this.blockDetector.isPoliteMode() ? 60000 : 30000;
    }

    private getDelayMs(): number {
        return this.blockDetector.isPoliteMode() ? POLITE_DELAY_MS : NORMAL_DELAY_MS;
    }

    private async ensurePythonWorker(): Promise<IndeedPythonWorker | null> {
        if (this.pythonWorker) return this.pythonWorker;
        try {
            const worker = new IndeedPythonWorker();
            await worker.start();
            this.pythonWorker = worker;
            console.log('🐍 Indeed Python worker ready.');
            return this.pythonWorker;
        } catch (error) {
            console.warn('⚠️ Unable to start Python worker:', (error as Error).message);
            this.pythonWorker = null;
            return null;
        }
    }

    private async fetchJobsViaPython(query: QuerySpec, offset: number): Promise<{ jobs: SearchJob[]; pageFingerprint: string; blocked: boolean; blockReason?: string } | null> {
        const worker = await this.ensurePythonWorker();
        if (!worker) return null;
        try {
            console.log(`🐍 Python → ${query.keyword} | ${query.city} | start=${offset}`);
            const result = await worker.discover(query.keyword, query.city, offset, query.days);
            const jobs = result.jobs as SearchJob[];
            const fingerprints = jobs.map((job: SearchJob) => job.jobKey || job.jobUrl || '').filter(Boolean).join('|');
            const pageFingerprint = crypto.createHash('sha1').update(fingerprints).digest('hex');
            return { jobs, pageFingerprint, blocked: result.blocked, blockReason: result.reason };
        } catch (error) {
            console.warn('⚠️ Python discover failed:', (error as Error).message);
            return null;
        }
    }

    private async fetchDetailViaPython(job: SearchJob): Promise<DetailFetchOutcome | null> {
        const worker = await this.ensurePythonWorker();
        if (!worker || !job.jobUrl) return null;
        const emptyResult: JobDetailResult = {
            description: '',
            jobType: 'Not Specified',
            careerLevel: 'Not Specified',
            workType: 'On-site',
            experience: 'Not Specified',
        };
        try {
            const data = await worker.detail(job.jobUrl);
            const description = this.ensureValue(data?.description, '');
            const title = this.ensureValue(job.title, '');
            const inferredCareer = this.inferCareerLevel(title, description);
            const inferredJobType = this.inferJobType(description);
            const inferredWorkType = this.inferWorkType(description);
            const inferredExperience = this.inferExperience(description);
            const normalizedPythonExperience = this.normalizeExperienceValue(data?.experience);
            const detail: JobDetailResult = {
                description,
                jobType: this.pickBestValue(inferredJobType, data?.jobType, 'Not Specified'),
                careerLevel: inferredCareer,
                workType: this.pickBestValue(inferredWorkType, data?.workType, 'On-site'),
                experience: this.pickBestValue(inferredExperience, normalizedPythonExperience, 'Not Specified'),
            };
            const blocked = !!data?.blocked;
            return { detail, blocked, invalid: false };
        } catch (error) {
            console.warn('⚠️ Python detail failed:', (error as Error).message);
            return { detail: emptyResult, blocked: true, invalid: false };
        }
    }

    private resolveJobKey(job: SearchJob): string {
        if (job.jobKey) return job.jobKey;
        const url = job.jobUrl || '';
        const match = url.match(/jk=([a-f0-9]+)/i);
        return match ? match[1] : '';
    }

    private normalizeJobUrl(jobUrl: string | undefined, jobKey: string): string {
        if (jobKey) return `${BASE_URL}/viewjob?jk=${jobKey}`;
        if (!jobUrl) return '';
        if (jobUrl.startsWith('/')) return `${BASE_URL}${jobUrl}`;
        return jobUrl;
    }

    private ensureValue(value: string | undefined, fallback: string): string {
        const trimmed = (value || '').trim();
        return trimmed ? trimmed : fallback;
    }

    private isDescriptionValid(description: string): boolean {
        return (description || '').trim().length >= this.descriptionMinLength;
    }

    private buildRequestHeaders(referer?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': this.userAgent,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };
        if (referer) headers['Referer'] = referer;
        return headers;
    }

    private pickBestValue(primary: string | undefined, secondary: string | undefined, fallback: string): string {
        const primaryValue = (primary || '').trim();
        if (primaryValue && primaryValue.toLowerCase() !== 'not specified') return primaryValue;
        const secondaryValue = (secondary || '').trim();
        return secondaryValue ? secondaryValue : fallback;
    }

    private inferCareerLevel(title: string, description: string): string {
        const lowerTitle = (title || '').toLowerCase();
        const lowerDesc = (description || '').toLowerCase();
        const seniorPattern = /\b(senior|sr\.?|lead|principal)\b/;
        const juniorPattern = /\b(junior|jr\.?|associate|entry\s+level)\b/;
        const internPattern = /\b(internship|intern|trainee)\b/;
        const managerPattern = /\b(manager|head|director)\b/;
        const executivePattern = /\b(executive|chief|vp|vice\s+president)\b/;

        if (seniorPattern.test(lowerTitle) || seniorPattern.test(lowerDesc)) return 'Senior';
        if (juniorPattern.test(lowerTitle) || juniorPattern.test(lowerDesc)) return 'Junior/Entry';
        if (internPattern.test(lowerTitle) || internPattern.test(lowerDesc)) return 'Internship';
        if (managerPattern.test(lowerTitle) || /\bleadership\b/.test(lowerDesc) || managerPattern.test(lowerDesc)) return 'Manager';
        if (executivePattern.test(lowerTitle)) return 'Executive';

        return 'Not Specified';
    }

    private inferWorkType(description: string): string {
        const lower = (description || '').toLowerCase();
        if (lower.includes('remote') || lower.includes('work from home')) return 'Remote';
        if (lower.includes('hybrid')) return 'Hybrid';
        return 'On-site';
    }

    private inferExperience(description: string): string {
        const match = (description || '').match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
        if (!match) return 'Not Specified';
        const years = parseInt(match[1], 10);
        if (!Number.isFinite(years) || years <= 0 || years > 15) return 'Not Specified';
        return `${years} Years`;
    }

    private normalizeExperienceValue(value: string | undefined): string {
        const match = (value || '').match(/\b(\d{1,2})\b/);
        if (!match) return 'Not Specified';
        const years = parseInt(match[1], 10);
        if (!Number.isFinite(years) || years <= 0 || years > 15) return 'Not Specified';
        return `${years} Years`;
    }

    private inferJobType(description: string): string {
        const lower = (description || '').toLowerCase();
        if (lower.includes('full-time') || lower.includes('full time')) return 'Full-time';
        if (lower.includes('part-time') || lower.includes('part time')) return 'Part-time';
        if (lower.includes('contract')) return 'Contract';
        if (lower.includes('temporary') || lower.includes('temp')) return 'Temporary';
        if (/\b(internship|intern)\b/.test(lower)) return 'Internship';
        return '';
    }

    // ─── Core Query Loop ──────────────────────────────────────────────
    private async runQuery(query: QuerySpec): Promise<RunQueryResult> {
        if (!this.pythonWorker && (!this.page || !this.context)) return { deferred: false };

        const queryState = this.stateStore.getQueryState(query.queryKey);
        let offset = queryState.lastOffset || 0;
        let consecutiveEmpty = queryState.consecutiveEmptyPages || 0;
        let lastFingerprint = queryState.lastPageFingerprint;
        let pagesVisited = 0;

        if (this.fetchMode === 'python') {
            offset = 0;
        }

        while (true) {
            if (this.blockDetector.isGlobalCooldown()) {
                return {
                    deferred: true,
                    deferMs: this.blockDetector.getGlobalCooldownRemainingMs(),
                    reason: 'global_cooldown'
                };
            }
            if (LIMIT_PAGES > 0 && pagesVisited >= LIMIT_PAGES) break;
            if (consecutiveEmpty >= MAX_EMPTY_PAGES) break;
            if (this.blockDetector.isInCooldown(query.queryKey)) {
                return {
                    deferred: true,
                    deferMs: this.blockDetector.getBucketCooldownRemainingMs(query.queryKey),
                    reason: 'bucket_cooldown'
                };
            }

            const searchUrl = this.buildSearchUrl(query, offset);

            let parsedJobs: SearchJob[] = [];
            let pageFingerprint = '';
            let usedPython = false;

            if (this.fetchMode === 'python') {
                const pyResult = await this.fetchJobsViaPython(query, offset);
                if (pyResult) {
                    if (pyResult.blocked) {
                        console.warn('🛑 Python block detected! Restarting context to rotate profile...');
                        await this.restartContext(); // 🔥 Force profile rotation

                        this.blockDetector.registerSignal(
                            {
                                type: 'python_block',
                                url: searchUrl,
                                message: pyResult.blockReason || 'python_blocked',
                                keyword: query.keyword,
                                city: query.city,
                            },
                            query.queryKey
                        );
                        this.metrics.recordBlockSignal(query.queryKey);
                        return {
                            deferred: true,
                            deferMs: this.blockDetector.getBucketCooldownRemainingMs(query.queryKey) || this.getRetryDelayMs(1),
                            reason: 'python_block'
                        };
                    }
                    parsedJobs = pyResult.jobs;
                    pageFingerprint = pyResult.pageFingerprint;
                    usedPython = true;
                }
            } else {
                // API-first fetch, page fallback if needed
                let pageResult: { html: string; title: string } | null = null;
                pageResult = await this.fetchViaAPI(searchUrl, query);

                if (!pageResult) {
                    console.log('⚠️ API fetch failed. Trying page navigation fallback...');
                    pageResult = await this.fetchViaPage(searchUrl, query);
                }

                if (!pageResult && this.fetchMode === 'auto') {
                    const pyResult = await this.fetchJobsViaPython(query, offset);
                    if (pyResult) {
                        if (pyResult.blocked) {
                            console.warn('🛑 Python block detected (auto-fallback)! Restarting context to rotate profile...');
                            await this.restartContext();

                            this.blockDetector.registerSignal(
                                {
                                    type: 'python_block_auto',
                                    url: searchUrl,
                                    message: pyResult.blockReason || 'python_blocked',
                                    keyword: query.keyword,
                                    city: query.city,
                                },
                                query.queryKey
                            );
                            this.metrics.recordBlockSignal(query.queryKey);
                            return {
                                deferred: true,
                                deferMs: this.blockDetector.getBucketCooldownRemainingMs(query.queryKey) || this.getRetryDelayMs(1),
                                reason: 'python_block_auto'
                            };
                        }
                        parsedJobs = pyResult.jobs;
                        pageFingerprint = pyResult.pageFingerprint;
                        usedPython = true;
                    }
                }

                if (pageResult) {
                    const { html, title } = pageResult;

                    // Block Detection
                    const blockSignal = this.blockDetector.detectFromContent(title, html, searchUrl);
                    if (blockSignal) {
                        console.warn(`🛑 Block detected in content: ${blockSignal.message}`);
                        if (this.page) {
                            await this.debugDumper.dump(this.page, { url: searchUrl, query }, 'content_block');
                        }

                        this.blockDetector.registerSignal(
                            { ...blockSignal, keyword: query.keyword, city: query.city },
                            query.queryKey
                        );
                        this.metrics.recordBlockSignal(query.queryKey);
                        console.warn('🛑 Block detected in content! Restarting context...');
                        await this.restartContext();
                        consecutiveEmpty += 1;
                        continue;
                    }

                    const parsed = IndeedSearchParser.parse(html, BASE_URL);
                    parsedJobs = parsed.jobs;
                    pageFingerprint = parsed.pageFingerprint;
                }
            }

            if (!parsedJobs || parsedJobs.length === 0) {
                consecutiveEmpty += 1;
                this.metrics.recordEmptyPage(query.queryKey);
                if (this.fetchMode === 'python') {
                    this.stateStore.updateQueryState(query.queryKey, {
                        lastOffset: 0,
                        lastRunAt: new Date().toISOString(),
                        consecutiveEmptyPages: consecutiveEmpty,
                        lastPageFingerprint: lastFingerprint,
                    });
                    this.stateStore.save();
                    break;
                }
                if (!usedPython && consecutiveEmpty > 2) {
                    console.log('🔄 Too many consecutive failures, restarting context...');
                    await this.restartContext();
                }
                offset += PAGE_SIZE;
                pagesVisited += 1;
                continue;
            }

            if (pageFingerprint && pageFingerprint === lastFingerprint) break;

            lastFingerprint = pageFingerprint;
            this.metrics.recordCardsFound(query.queryKey, parsedJobs.length);
            this.metrics.recordPageVisited(query.queryKey);
            console.log(`📋 Page ${pagesVisited + 1}: ${parsedJobs.length} cards found`);

            if (parsedJobs.length === 0) {
                consecutiveEmpty += 1;
                this.metrics.recordEmptyPage(query.queryKey);
            } else {
                consecutiveEmpty = 0;
            }

            const oldestDays = this.getOldestDays(parsedJobs);
            if (oldestDays !== null && oldestDays > query.days) break;

            // ─── Honeypot Filtering ───────────────────────────────
            const beforeCount = parsedJobs.length;
            parsedJobs = parsedJobs.filter(job => {
                if (job.jobKey && IndeedScraper.isHoneypotKey(job.jobKey)) {
                    console.log(`🍯 Honeypot filtered: ${job.jobKey} ("${job.title}"`);
                    return false;
                }
                return true;
            });
            if (beforeCount !== parsedJobs.length) {
                console.log(`🍯 Filtered ${beforeCount - parsedJobs.length} honeypot jobs, ${parsedJobs.length} remaining`);
            }

            await this.processJobs(parsedJobs, query);

            pagesVisited += 1;

            if (this.fetchMode === 'python') {
                this.stateStore.updateQueryState(query.queryKey, {
                    lastOffset: 0,
                    lastRunAt: new Date().toISOString(),
                    consecutiveEmptyPages: consecutiveEmpty,
                    lastPageFingerprint: lastFingerprint,
                });
                this.stateStore.save();
                await this.sleep(this.getDelayMs());
                break;
            }

            offset += PAGE_SIZE;

            this.stateStore.updateQueryState(query.queryKey, {
                lastOffset: offset,
                lastRunAt: new Date().toISOString(),
                consecutiveEmptyPages: consecutiveEmpty,
                lastPageFingerprint: lastFingerprint,
            });
            this.stateStore.save();

            await this.sleep(this.getDelayMs());
        }

        return { deferred: false };
    }

    private deferQuery(query: QuerySpec, waitMs: number, reason: string) {
        const key = query.queryKey;
        const current = this.deferredQueries.get(key);
        const attempts = (current?.attempts || 0) + 1;

        if (attempts > MAX_DEFERRED_ATTEMPTS) {
            this.deferredQueries.delete(key);
            console.log(`⛔ Dropping deferred query after ${attempts - 1} attempts: ${key}`);
            return;
        }

        const delay = Math.max(waitMs || 0, this.getRetryDelayMs(attempts));
        const nextAttemptAt = Date.now() + delay;
        this.deferredQueries.set(key, {
            query,
            attempts,
            nextAttemptAt,
            reason
        });

        console.log(`⏸️ Deferred ${key} for ${Math.round(delay / 1000)}s (${reason})`);
    }

    private async processDeferredQueries() {
        if (this.deferredQueries.size === 0) return;
        if (this.blockDetector.isGlobalCooldown()) {
            console.log('⏳ Global cooldown active. Skipping deferred retries this run.');
            return;
        }

        console.log(`🔁 Processing deferred queries (${this.deferredQueries.size})...`);
        let cycles = 0;

        while (this.deferredQueries.size > 0 && cycles < MAX_DEFERRED_CYCLES) {
            const now = Date.now();
            let earliest = Number.POSITIVE_INFINITY;
            let progressed = false;

            for (const [key, entry] of Array.from(this.deferredQueries.entries())) {
                if (entry.nextAttemptAt <= now) {
                    progressed = true;
                    const result = await this.runQuery(entry.query);
                    if (result.deferred) {
                        this.deferQuery(entry.query, result.deferMs || 0, result.reason || entry.reason);
                    } else {
                        this.deferredQueries.delete(key);
                    }
                } else {
                    earliest = Math.min(earliest, entry.nextAttemptAt);
                }
            }

            if (this.deferredQueries.size === 0) break;

            if (!progressed && earliest !== Number.POSITIVE_INFINITY) {
                const waitMs = Math.min(Math.max(earliest - Date.now(), 0), MAX_DEFERRED_WAIT_MS);
                if (waitMs > 0) {
                    await this.sleep(waitMs);
                }
            }

            cycles += 1;
        }

        if (this.deferredQueries.size > 0) {
            console.log(`⏭️ Deferred queries remaining: ${this.deferredQueries.size}`);
        }
    }

    private buildSearchUrl(query: QuerySpec, offset: number): string {
        const keyword = encodeURIComponent(query.keyword);
        const city = encodeURIComponent(query.city);
        return `${BASE_URL}/jobs?q=${keyword}&l=${city}&fromage=${query.days}&start=${offset}`;
    }

    // ─── Fetch: API-First (Hybrid) ────────────────────────────────────
    private async fetchViaAPI(
        url: string,
        query: QuerySpec
    ): Promise<{ html: string; title: string } | null> {
        if (!this.context) return null;
        try {
            console.log(`🚀 API → ${url}`);
            const response = await this.context.request.get(url, {
                timeout: this.getNavigationTimeout(),
                headers: this.buildRequestHeaders(BASE_URL),
            });
            const status = response.status();
            console.log(`📡 API Status: ${status}`);

            if (status === 403 || status === 429) {
                this.blockDetector.registerSignal(
                    { type: 'http_status', status, url, keyword: query.keyword, city: query.city },
                    query.queryKey
                );
                this.metrics.recordBlockSignal(query.queryKey);
                return null;
            }

            const html = await response.text();
            const title = this.extractTitle(html);
            return { html, title };
        } catch (error) {
            console.warn('💥 API error:', (error as Error).message);
            return null;
        }
    }

    // ─── Fetch: Browser Fallback ──────────────────────────────────────
    private async fetchViaPage(
        url: string,
        query: QuerySpec
    ): Promise<{ html: string; title: string } | null> {
        if (!this.page) return null;
        try {
            console.log(`🌐 Page → ${url}`);
            const response = await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: this.getNavigationTimeout(),
                referer: BASE_URL,
            });
            const status = response?.status();
            console.log(`📄 Page Status: ${status}`);

            if (status && [403, 429, 503].includes(status)) {
                await this.debugDumper.dump(this.page, { url, query }, `status_block_${status}`);
                this.blockDetector.registerSignal(
                    { type: 'http_status', status, url, keyword: query.keyword, city: query.city },
                    query.queryKey
                );
                this.metrics.recordBlockSignal(query.queryKey);
                return null;
            }

            // Wait for job cards (best effort)
            const waitMs = this.blockDetector.isPoliteMode() ? 25000 : 15000;
            try {
                await this.page.waitForSelector('a[data-jk], .job_seen_beacon', {
                    timeout: waitMs,
                });
            } catch {
                console.log('⚠️ waitForSelector timeout — checking content anyway');
            }

            const title = await this.page.title();
            const html = await this.page.content();
            const contentSignal = this.blockDetector.detectFromContent(title, html, url);
            if (contentSignal) {
                await this.debugDumper.dump(this.page, { url, query }, 'content_block');
                this.blockDetector.registerSignal(
                    { ...contentSignal, keyword: query.keyword, city: query.city },
                    query.queryKey
                );
                this.metrics.recordBlockSignal(query.queryKey);
                return null;
            }
            return { html, title };
        } catch (error) {
            console.error('💥 Page error:', (error as Error).message);
            await this.debugDumper.dump(this.page, { url, query }, 'search_page_error');
            this.metrics.recordCardError(query.queryKey, 'search_page_error');
            return null;
        }
    }

    private extractTitle(html: string): string {
        const match = html.match(/<title>([^<]*)<\/title>/i);
        return match ? match[1].trim() : '';
    }

    // ─── Job Processing ───────────────────────────────────────────────
    private async processJobs(jobs: SearchJob[], query: QuerySpec) {
        let processed = 0;
        for (const job of jobs) {
            if (job.isSponsored) continue;
            const resolvedJobKey = this.resolveJobKey(job);
            const resolvedJobUrl = this.normalizeJobUrl(job.jobUrl, resolvedJobKey);
            const enrichedJob: SearchJob = {
                ...job,
                jobKey: resolvedJobKey || job.jobKey,
                jobUrl: resolvedJobUrl || job.jobUrl,
            };

            const dedupeKey = this.buildDedupeKey(enrichedJob);
            if (!dedupeKey) continue;

            if (this.knownKeys.has(dedupeKey)) continue;

            if (this.stateStore.hasQuerySeenKey(query.queryKey, dedupeKey)) continue;
            this.stateStore.trackQuerySeenKey(query.queryKey, dedupeKey);

            if (!enrichedJob.jobUrl) {
                this.metrics.recordDetailError(query.queryKey, 'missing_job_url');
                this.knownKeys.add(dedupeKey);
                continue;
            }

            if (MAX_JOBS_PER_QUERY > 0 && processed >= MAX_JOBS_PER_QUERY) break;
            processed += 1;

            const now = new Date().toISOString();
            const seen = this.stateStore.markSeen(dedupeKey, now);
            if (!seen.isNew) continue;

            const detailOutcome = await this.fetchDetail(enrichedJob, query);
            const detail = detailOutcome.detail;

            if (detailOutcome.invalid) {
                this.metrics.recordDetailError(query.queryKey, 'detail_invalid');
                this.knownKeys.add(dedupeKey);
                continue;
            }
            const description = detail.description || '';
            const descriptionOk = this.isDescriptionValid(description);
            const descriptionStatus = detailOutcome.blocked
                ? 'blocked'
                : descriptionOk
                    ? 'ok'
                    : 'missing';

            const title = this.ensureValue(enrichedJob.title, 'Unknown');
            const company = this.ensureValue(enrichedJob.company, 'Unknown');
            const location = this.ensureValue(enrichedJob.location, query.city || 'Egypt');
            const postedDate = this.ensureValue(enrichedJob.postedDate, 'Not Specified');
            const jobUrl = this.ensureValue(enrichedJob.jobUrl, '');
            const jobKey = enrichedJob.jobKey || '';
            const jobKeyValue = this.ensureValue(jobKey, 'Not Specified');
            const jobType = this.ensureValue(detail.jobType, 'Not Specified');
            const careerLevel = this.ensureValue(detail.careerLevel, 'Not Specified');
            const workType = this.ensureValue(detail.workType, 'On-site');
            const experience = this.ensureValue(detail.experience, 'Not Specified');
            const category = this.ensureValue(query.category, query.keyword);

            if (descriptionStatus !== 'ok' && jobUrl) {
                if (descriptionStatus === 'missing') {
                    this.metrics.recordMissingDescription(query.queryKey);
                }
                this.stateStore.enqueueRetry({
                    jobKey,
                    jobUrl,
                    keyword: query.keyword,
                    city: query.city,
                    mode: query.mode,
                    attempts: 1,
                    nextAttemptAt: new Date(
                        Date.now() + this.getRetryDelayMs(1)
                    ).toISOString(),
                    lastError:
                        descriptionStatus === 'blocked'
                            ? 'blocked_detail'
                            : 'missing_description',
                    payload: {
                        title,
                        company,
                        location,
                        postedDate,
                        jobType,
                        careerLevel,
                        workType,
                        category,
                        experience,
                        jobKey,
                        queryKeyword: query.keyword,
                        firstSeenAt: seen.firstSeenAt,
                        lastSeenAt: seen.lastSeenAt,
                    },
                });
                this.knownKeys.add(dedupeKey);
                continue;
            }

            if (!descriptionOk) {
                this.knownKeys.add(dedupeKey);
                continue;
            }

            const record: JobRecord = {
                title,
                company,
                location,
                postedDate,
                url: jobUrl,
                source: 'Indeed',
                description,
                jobType,
                careerLevel,
                workType,
                category,
                experience,
                jobKey: jobKeyValue,
                queryKeyword: query.keyword,
                firstSeenAt: seen.firstSeenAt,
                lastSeenAt: seen.lastSeenAt,
                descriptionStatus: 'ok',
            };

            this.sink.write(record);
            this.dbSink.write(record);
            this.metrics.recordJobsSaved(query.queryKey, 1);
            this.knownKeys.add(dedupeKey);
            await this.sleep(this.getDelayMs());
        }
    }

    // ─── Detail Fetch (API-First + Page Fallback) ─────────────────────
    private async fetchDetail(
        job: SearchJob,
        query: QuerySpec
    ): Promise<DetailFetchOutcome> {
        const emptyResult: JobDetailResult = {
            description: '',
            jobType: 'Not Specified',
            careerLevel: 'Not Specified',
            workType: 'On-site',
            experience: 'Not Specified',
        };

        let blocked = false;
        let invalid = false;
        for (let attempt = 1; attempt <= DETAIL_BLOCK_RETRIES + 1; attempt++) {
            const outcome = await this.fetchDetailOnce(job, query);
            if (outcome.invalid) {
                invalid = true;
                return { detail: outcome.detail, blocked: false, invalid: true };
            }
            if (this.isDescriptionValid(outcome.detail.description)) {
                return outcome;
            }
            if (outcome.blocked) {
                blocked = true;
                await this.sleep(this.getRetryDelayMs(attempt, DETAIL_BLOCK_BACKOFF_BASE_MS));
                continue;
            }
            break;
        }
        return { detail: emptyResult, blocked, invalid };
    }

    private async fetchDetailOnce(
        job: SearchJob,
        query: QuerySpec
    ): Promise<DetailFetchOutcome> {
        const emptyResult: JobDetailResult = {
            description: '',
            jobType: 'Not Specified',
            careerLevel: 'Not Specified',
            workType: 'On-site',
            experience: 'Not Specified',
        };
        if (this.fetchMode !== 'browser') {
            const pyOutcome = await this.fetchDetailViaPython(job);
            if (pyOutcome) return pyOutcome;
        }
        if (!this.context || !job.jobUrl)
            return { detail: emptyResult, blocked: false, invalid: false };

        // 1. API request (fast, uses session cookies)
        try {
            const response = await this.context.request.get(job.jobUrl, {
                timeout: this.getNavigationTimeout(),
                headers: this.buildRequestHeaders(BASE_URL),
            });
            const status = response.status();
            if (status === 403 || status === 429)
                return { detail: emptyResult, blocked: true, invalid: false };

            const html = await response.text();
            const validation = this.validateDetailHtml(html, job.jobKey, job.jobUrl);
            if (validation.blocked) return { detail: emptyResult, blocked: true, invalid: false };
            if (validation.invalid) return { detail: emptyResult, blocked: false, invalid: true };

            const detail = IndeedJobDetailParser.parse(html);
            if (this.isDescriptionValid(detail.description))
                return { detail, blocked: false, invalid: false };
        } catch { }

        // 2. Fallback: open a new page
        let detailPage: Page | null = null;
        try {
            detailPage = await this.context.newPage();
            await detailPage.goto(job.jobUrl, {
                waitUntil: 'domcontentloaded',
                timeout: this.getNavigationTimeout(),
            });
            const html = await detailPage.content();
            const validation = this.validateDetailHtml(html, job.jobKey, job.jobUrl);
            if (validation.blocked) {
                return { detail: emptyResult, blocked: true, invalid: false };
            }
            if (validation.invalid) {
                return { detail: emptyResult, blocked: false, invalid: true };
            }

            const detail = IndeedJobDetailParser.parse(html);
            return { detail, blocked: false, invalid: false };
        } catch {
            return { detail: emptyResult, blocked: true, invalid: false };
        } finally {
            if (detailPage) {
                try {
                    await detailPage.close();
                } catch { }
            }
        }
    }

    // ─── Retry Queue ──────────────────────────────────────────────────
    private async processRetryQueue() {
        const queue = this.stateStore.getRetryQueue();
        if (queue.length === 0 || !this.context) return;

        const now = Date.now();
        const remaining: RetryJob[] = [];

        for (const job of queue) {
            if (!job.payload) continue;
            if (job.attempts >= MAX_RETRY_ATTEMPTS) continue;
            if (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > now) {
                remaining.push(job);
                continue;
            }

            try {
                const response = await this.context.request.get(job.jobUrl, {
                    timeout: this.getNavigationTimeout(),
                });
                if (response.status() === 403) throw new Error('blocked');
                const html = await response.text();
                const validation = this.validateDetailHtml(html, job.jobKey, job.jobUrl);
                if (validation.blocked) throw new Error('blocked');
                if (validation.invalid) {
                    this.metrics.recordDetailError(`${job.keyword}||${job.city}||${job.mode}`, 'detail_invalid');
                    continue;
                }
                const detail = IndeedJobDetailParser.parse(html);

                if (this.isDescriptionValid(detail.description)) {
                    const payload = job.payload;
                    const jobType = this.pickBestValue(detail.jobType, payload.jobType, 'Not Specified');
                    const careerLevel = this.pickBestValue(detail.careerLevel, payload.careerLevel, 'Not Specified');
                    const workType = this.pickBestValue(detail.workType, payload.workType, 'On-site');
                    const experience = this.pickBestValue(detail.experience, payload.experience, 'Not Specified');
                    const jobKeyFromUrl = job.jobUrl ? (job.jobUrl.match(/jk=([a-f0-9]+)/i)?.[1] || '') : '';
                    const jobKey = payload.jobKey || job.jobKey || jobKeyFromUrl;
                    const jobKeyValue = this.ensureValue(jobKey, 'Not Specified');
                    const record: JobRecord = {
                        title: this.ensureValue(payload.title, 'Unknown'),
                        company: this.ensureValue(payload.company, 'Unknown'),
                        location: this.ensureValue(payload.location, 'Egypt'),
                        postedDate: this.ensureValue(payload.postedDate, 'Not Specified'),
                        url: this.ensureValue(job.jobUrl, ''),
                        source: 'Indeed',
                        description: detail.description,
                        jobType,
                        careerLevel,
                        workType,
                        category: this.ensureValue(payload.category, 'Not Specified'),
                        experience,
                        jobKey: jobKeyValue,
                        queryKeyword: this.ensureValue(payload.queryKeyword, 'Unknown'),
                        firstSeenAt: payload.firstSeenAt,
                        lastSeenAt: new Date().toISOString(),
                        descriptionStatus: 'retry_ok',
                    };
                    this.sink.write(record);
                    this.dbSink.write(record);
                    this.metrics.recordJobsSaved(
                        `${job.keyword}||${job.city}||${job.mode}`,
                        1
                    );
                    if (jobKey) {
                        this.knownKeys.add(`jk:${jobKey}`);
                    } else {
                        this.knownKeys.add(`url:${job.jobUrl}`);
                    }
                    continue;
                }
                throw new Error('missing_description');
            } catch (error) {
                const reason = (error as Error).message || 'retry_failed';
                remaining.push({
                    ...job,
                    attempts: job.attempts + 1,
                    nextAttemptAt: new Date(
                        Date.now() + this.getRetryDelayMs(job.attempts + 1)
                    ).toISOString(),
                    lastError: reason,
                });
                continue;
            }
        }

        this.stateStore.replaceRetryQueue(remaining);
        this.stateStore.save();
    }

    // ─── Utilities ────────────────────────────────────────────────────
    private buildDedupeKey(job: SearchJob): string {
        const jobKey = this.resolveJobKey(job);
        if (jobKey) return `jk:${jobKey}`;
        const jobUrl = this.normalizeJobUrl(job.jobUrl, jobKey);
        if (jobUrl) return `url:${jobUrl}`;
        const raw = `${job.title}|${job.company}|${job.location}`.toLowerCase();
        const hash = crypto.createHash('sha1').update(raw).digest('hex');
        return `hash:${hash}`;
    }

    private getOldestDays(jobs: SearchJob[]): number | null {
        let maxDays: number | null = null;
        for (const job of jobs) {
            const days = this.parseDaysAgo(job.postedDate);
            if (days !== null) {
                maxDays = maxDays === null ? days : Math.max(maxDays, days);
            }
        }
        return maxDays;
    }

    private parseDaysAgo(text: string): number | null {
        const lower = (text || '').toLowerCase();
        if (!lower) return null;
        if (lower.includes('today') || lower.includes('just posted')) return 0;
        const match = lower.match(/(\d+)\+?\s*day/);
        if (match) return parseInt(match[1], 10);
        return null;
    }

    private validateDetailHtml(html: string, jobKey?: string, url?: string): { blocked: boolean; invalid: boolean } {
        const contentSignal = this.blockDetector.detectFromContent('', html, url);
        if (contentSignal) {
            return { blocked: true, invalid: false };
        }

        const lowerHtml = (html || '').toLowerCase();
        if (/not found\s*\|\s*indeed/.test(lowerHtml) || /we can.?t find this page/.test(lowerHtml)) {
            return { blocked: false, invalid: true };
        }
        if (lowerHtml.includes('job has been expired') || lowerHtml.includes('job not found')) {
            return { blocked: false, invalid: true };
        }

        const hasDescriptionMarker = /jobDescriptionText|jobsearch-JobComponent-description/i.test(html);
        const hasJobPosting = this.hasJobPostingSchema(html);

        if (!hasDescriptionMarker && !hasJobPosting) {
            return { blocked: false, invalid: true };
        }

        if (jobKey) {
            const canonicalMatch = html.match(/rel="canonical"[^>]*href="([^"]+)"/i);
            if (canonicalMatch && !canonicalMatch[1].includes(jobKey)) {
                return { blocked: false, invalid: true };
            }
        }

        return { blocked: false, invalid: false };
    }

    private hasJobPostingSchema(html: string): boolean {
        const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
        let match: RegExpExecArray | null;
        while ((match = scriptRegex.exec(html)) !== null) {
            const raw = match[1].trim();
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (this.containsJobPosting(parsed)) return true;
            } catch {
                if (/"@type"\s*:\s*"JobPosting"/i.test(raw)) return true;
            }
        }

        return /"@type"\s*:\s*"JobPosting"/i.test(html);
    }

    private containsJobPosting(value: any): boolean {
        if (!value) return false;
        if (Array.isArray(value)) {
            return value.some(entry => this.containsJobPosting(entry));
        }
        if (typeof value === 'object') {
            const type = value['@type'] || value.type;
            if (typeof type === 'string' && type.toLowerCase() === 'jobposting') return true;
            if (Array.isArray(type) && type.some((t: string) => t.toLowerCase() === 'jobposting')) return true;
            for (const key of Object.keys(value)) {
                if (this.containsJobPosting(value[key])) return true;
            }
        }
        return false;
    }

    private loadKnownKeysFromCsv() {
        if (!fs.existsSync(CSV_PATH)) return;
        const content = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length <= 1) return;

        const header = this.parseCsvLine(lines[0]);
        const jobKeyIndex = this.getHeaderIndex(header, ['Job Key']);
        const urlIndex = this.getHeaderIndex(header, ['Job URL', 'URL']);
        const titleIndex = this.getHeaderIndex(header, ['Job Title', 'Title']);
        const companyIndex = this.getHeaderIndex(header, ['Company Name', 'Company']);
        const locationIndex = this.getHeaderIndex(header, ['Location']);

        let loaded = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = this.parseCsvLine(lines[i]);
            let key = '';
            const jobKey = jobKeyIndex >= 0 ? cols[jobKeyIndex] : '';
            const url = urlIndex >= 0 ? cols[urlIndex] : '';

            if (jobKey) {
                key = `jk:${jobKey}`;
            } else if (url) {
                key = `url:${url}`;
            } else {
                const title = titleIndex >= 0 ? cols[titleIndex] : '';
                const company = companyIndex >= 0 ? cols[companyIndex] : '';
                const location = locationIndex >= 0 ? cols[locationIndex] : '';
                if (title || company || location) {
                    const raw = `${title}|${company}|${location}`.toLowerCase();
                    const hash = crypto.createHash('sha1').update(raw).digest('hex');
                    key = `hash:${hash}`;
                }
            }

            if (key && !this.knownKeys.has(key)) {
                this.knownKeys.add(key);
                this.stateStore.markSeen(key, new Date().toISOString());
                loaded++;
            }
        }

        if (loaded > 0) {
            console.log(`📂 Loaded ${loaded} known jobs from CSV`);
        }
    }

    private parseCsvLine(line: string): string[] {
        const columns: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                columns.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        columns.push(current);

        return columns.map(value => {
            let cleaned = value.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            }
            return cleaned.replace(/""/g, '"');
        });
    }

    private getHeaderIndex(header: string[], candidates: string[]): number {
        const lower = header.map(value => value.toLowerCase());
        for (const candidate of candidates) {
            const idx = lower.indexOf(candidate.toLowerCase());
            if (idx >= 0) return idx;
        }
        return -1;
    }

    private async sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private getRetryDelayMs(attempt: number, baseMs: number = RETRY_BACKOFF_BASE_MS): number {
        const backoff =
            baseMs * Math.pow(2, Math.max(0, attempt - 1));
        const jitter = Math.floor(Math.random() * 10000);
        return backoff + jitter;
    }
}
