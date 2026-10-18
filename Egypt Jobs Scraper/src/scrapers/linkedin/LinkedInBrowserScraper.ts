
import { BaseScraper } from '../../core/BaseScraper';
import { JobEntity, PartialJob } from '../../core/ScraperInterface';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Converts LinkedIn's relative time format to absolute ISO date string.
 * Examples: "1 hour ago", "2 days ago", "3 weeks ago", "1 month ago", "2 years ago"
 */
function convertRelativeTimeToDate(relativeTime: string): string {
    const now = new Date();
    const lower = relativeTime.toLowerCase().trim();

    // Extract number (default to 1 if not found, e.g., "an hour ago")
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 1;

    if (lower.includes('minute') || lower.includes('min')) {
        now.setMinutes(now.getMinutes() - num);
    } else if (lower.includes('hour')) {
        now.setHours(now.getHours() - num);
    } else if (lower.includes('day')) {
        now.setDate(now.getDate() - num);
    } else if (lower.includes('week')) {
        now.setDate(now.getDate() - (num * 7));
    } else if (lower.includes('month')) {
        now.setMonth(now.getMonth() - num);
    } else if (lower.includes('year')) {
        now.setFullYear(now.getFullYear() - num);
    }
    // If no pattern matched, return current time as fallback

    return now.toISOString();
}

export class LinkedInBrowserScraper extends BaseScraper {
    name = 'LinkedIn Professional';
    baseUrl = 'https://www.linkedin.com';
    defaultPageSize = 25;

    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;

    // --- PROFESSIONAL CONFIGURATION ---
    private isHeadless = true;
    private proxies: string[] = [];
    private currentProxyIndex = 0;
    private consecutiveMasks = 0;

    // Keywords to rotate through
    private keywords = [
        'Sales', 'Marketing', 'Engineering', 'Software', 'Customer Service',
        'HR', 'Accountant', 'Medical', 'Operations', 'Finance', 'Project Manager',
        'Teacher', 'Legal', 'Data', 'Real Estate', 'Logistics', 'Translator'
    ];

    private processedIds: Set<string> = new Set();

    private getJitteredDelay(baseMs: number, maxVariance: number): number {
        // Use irrational numbers (Pi, E) and decimals to create an unpredictable, non-integer delay pattern
        const irrationalFactor = (Math.PI * Math.E * Math.random()) % 1; 
        const variance = maxVariance * (Math.random() > 0.5 ? 1 : -1) * irrationalFactor;
        const delay = Math.max(100, baseMs + variance);
        return delay; 
    }

    constructor() {
        super();
        console.log(`[LinkedIn] 🔧 Running in SPLIT_MODE: ${process.env.SPLIT_MODE || 'smart'}`);
        this.loadProxies();
        this.loadExistingIds();
    }

    public getHeaders(): string[] {
        const headers = [
            'Job Id', 'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type',
            'Posted Time', 'Job URL',
            'Description', 'Industry',
            'Source', 'Job Status',
            'Experience Level', 'Easy Apply', 'Applicants',
            'Requirements'
        ];

        if (process.env.SPLIT_MODE === 'raw') {
            return headers.filter(h => h !== 'Requirements');
        }
        return headers;
    }

    private loadProxies() {
        const proxyPath = path.join(process.cwd(), 'data', 'proxies.txt');
        if (fs.existsSync(proxyPath)) {
            const content = fs.readFileSync(proxyPath, 'utf-8');
            this.proxies = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'));

            if (this.proxies.length > 0) {
                console.log(`[LinkedIn] 🛡️ Loaded ${this.proxies.length} proxies.`);
                this.proxies.sort(() => Math.random() - 0.5);
            } else {
                console.log(`[LinkedIn] ℹ️ No proxies found. Using Stealth Headless Mode.`);
            }
        }
    }

    private loadExistingIds() {
        const csvPath = path.join(process.cwd(), 'data', 'linkedin_clean_data.csv');
        if (fs.existsSync(csvPath)) {
            const content = fs.readFileSync(csvPath, 'utf-8');
            const lines = content.split('\n');
            // Assuming first column is ID
            lines.slice(1).forEach(line => {
                const match = line.match(/^"?(\d+)"?/);
                if (match) this.processedIds.add(match[1]);
            });
            console.log(`[LinkedIn] 🧠 Knowledge Base: Loaded ${this.processedIds.size} existing job IDs. (Will Skip)`);
        }
    }

    // Moved getHeaders to top
    // public getHeaders(): string[] { ... }

    private async initBrowser(forceReset = false) {
        if (this.browser && !forceReset) return;

        if (this.browser) {
            console.log('[LinkedIn] 🔄 Refreshing Background Service...');
            await this.browser.close().catch(() => { });
            this.browser = null;
        }

        let launchOptions: any = {
            headless: this.isHeadless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Critical for headless stealth
                '--window-size=1920,1080',
                '--start-maximized'
            ]
        };

        if (this.proxies.length > 0) {
            const proxyUrl = this.proxies[this.currentProxyIndex % this.proxies.length];
            this.currentProxyIndex++;
            console.log(`[LinkedIn] 🌍 Using Proxy: ${proxyUrl}`);
            launchOptions.proxy = { server: proxyUrl };
        }

        // console.log('[LinkedIn] 🚀 Launching Background Service...');
        this.browser = await chromium.launch(launchOptions);

        this.context = await this.browser.newContext({
            // Real Chrome user agent to hide "Headless" trait
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            timezoneId: 'Africa/Cairo',
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            javaScriptEnabled: true
        });

        await this.context.clearCookies();

        this.page = await this.context.newPage();

        // Extra Stealth: Overwrite navigator.webdriver
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // @ts-ignore
            window.navigator.chrome = { runtime: {} };
            // @ts-ignore
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            // @ts-ignore
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });
    }

    public async discoverJobs(keyword: string): Promise<PartialJob[]> {
        // Refresh knowledge base before every search cycle
        this.loadExistingIds();

        await this.initBrowser();
        if (!this.page) throw new Error('Browser not initialized');

        console.log(`[LinkedIn] 🔍 Discovery Phase: Searching for "${keyword}"...`);
        const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=Egypt&sortBy=DD`;

        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch (e) {
            console.warn('[Discovery] Failed to load. Retrying with reload...');
            try {
                await this.page!.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
            } catch (e2) {
                console.warn('[Discovery] Reload failed. Hard Resetting...');
                await this.initBrowser(true);
                await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            }
        }

        let stuckCount = 0;
        const discovered = new Map<string, PartialJob>();
        const MAX_SCROLL_LOOPS = 50;

        try {
            for (let i = 0; i < MAX_SCROLL_LOOPS; i++) {
                // Safety check for context
                if (this.page?.isClosed()) break;

                let cards: any[] = [];
                try {
                    cards = await this.page!.$$('.base-card, .job-search-card');
                } catch (e) {
                    console.warn('[Discovery] ⚠️ Context Lost while fetching cards (Navigated?). Breaking scroll loop.');
                    break;
                }

                for (const card of cards) {
                    try {
                        const linkEl = await card.$('a.base-card__full-link');
                        const href = await linkEl?.getAttribute('href');
                        if (!href) continue;

                        let jobId = '';
                        const viewMatch = href.match(/\/view\/[^\/]*?-(\d{7,})\/?/) || href.match(/\/view\/(\d{7,})\/?/);
                        if (viewMatch) jobId = viewMatch[1];
                        else {
                            const endMatch = href.match(/-(\d{7,})\/?$/);
                            if (endMatch) jobId = endMatch[1];
                        }

                        // CRITICAL: Skip if already scraped OR already in current batch
                        if (!jobId || discovered.has(jobId) || this.processedIds.has(jobId)) {
                            // console.log(`[LinkedIn] ⏭️ Skipping Known/Duplicate Job: ${jobId}`);
                            continue;
                        }

                        const titleEl = await card.$('.base-search-card__title');
                        const companyEl = await card.$('.base-search-card__subtitle');
                        const locationEl = await card.$('.job-search-card__location');
                        const title = titleEl ? (await titleEl.innerText()).trim() : 'Unknown';
                        const company = companyEl ? (await companyEl.innerText()).trim() : 'Unknown';
                        const location = locationEl ? (await locationEl.innerText()).trim() : 'Egypt';

                        const metaEl = await card.$('.job-search-card__metadata');
                        const metaText = metaEl ? (await metaEl.innerText()).trim() : '';
                        let workMode = undefined;
                        if (metaText.includes('Remote')) workMode = 'Remote';
                        else if (metaText.includes('Hybrid')) workMode = 'Hybrid';
                        else if (metaText.includes('On-site')) workMode = 'On-site';

                        discovered.set(jobId, {
                            source_job_id: jobId,
                            url: href.split('?')[0],
                            title,
                            company_name: company,
                            location,
                            list_work_mode: workMode,
                            scraped_at: new Date()
                        });
                    } catch (e) { }
                }
                // console.log(`[LinkedIn] Discovered ${discovered.size} unique jobs so far...`);

                try {
                    const prevHeight = await this.page!.evaluate('document.body.scrollHeight');
                    await this.page!.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                    await this.page!.waitForTimeout(this.getJitteredDelay(2500, 1500));

                    const newHeight = await this.page!.evaluate('document.body.scrollHeight');
                    if (newHeight === prevHeight) stuckCount++;
                    else stuckCount = 0;

                    if (stuckCount > 3) {
                        try {
                            const btn = await this.page!.$('button.infinite-scroller__show-more-button');
                            if (btn && await btn.isVisible()) { await btn.click(); stuckCount = 0; }
                        } catch (e) { }
                    }

                    if (stuckCount > 6) break;
                } catch (e) {
                    // Navigation happened during scroll?
                    console.warn('[Discovery] Scroll warning:', e);
                    break;
                }
            }
        } catch (e) {
            console.warn('[Discovery] ⚠️ Context Lost during loop (Navigated?). Returning found jobs.', e);
        }
        return Array.from(discovered.values());
    }

    public async scrapeJobDetail(jobId: string, partialData: PartialJob, attempt = 1): Promise<JobEntity | null> {

        if (attempt > 3) {
            console.warn(`[LinkedIn] ❌ Job ${jobId} failed after 3 Retries. Skipping.`);
            return null;
        }

        if (!this.browser) await this.initBrowser();
        if (!this.context) this.context = await this.browser!.newContext();

        let detailPage: Page | null = null;
        try { detailPage = await this.context!.newPage(); }
        catch (e) {
            await this.initBrowser(true);
            detailPage = await this.page!;
        }

        const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
        console.log(`[LinkedIn] 🔬 Detailing Job: ${jobId}...`);

        try {
            await detailPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await detailPage.waitForTimeout(this.getJitteredDelay(3000, 1000));

            // --- 0. EARLY DATA EXTRACTION (PRE-OBFUSCATION) ---
            const earlyData = await detailPage.evaluate(() => {
                const data: any = { title: null, description: null, company: null, ldKeys: [] };
                
                // 1. JSON-LD
                try {
                    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
                    for (const script of Array.from(ldScripts)) {
                        const json = JSON.parse(script.textContent || '{}');
                        if (json['@type'] === 'JobPosting') {
                            data.ldKeys = Object.keys(json);
                            if (json.title) data.title = json.title;
                            if (json.description) data.description = json.description;
                            if (json.hiringOrganization && json.hiringOrganization.name) {
                                data.company = json.hiringOrganization.name;
                            }
                            break;
                        }
                    }
                } catch (e) { }

                // 2. SEO Noscript Fallback (Usually contains full HTML of the job post for SEO)
                if (!data.description || data.description.length < 300) {
                    const noscripts = document.querySelectorAll('noscript');
                    for (const ns of Array.from(noscripts)) {
                        const text = ns.textContent || '';
                        // LinkedIn's noscript often has a lot of text, we look for substantial length
                        if (text.length > 300) {
                            // Extract just the text content, strip HTML tags if any
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = text;
                            data.description = tempDiv.innerText || text;
                            break;
                        }
                    }
                }

                // 3. Meta Tags (Fallback)
                if (!data.title) {
                    const titleMeta = document.querySelector('meta[property="og:title"]');
                    if (titleMeta) data.title = titleMeta.getAttribute('content');
                }
                
                if (!data.description || data.description.length < 300) {
                    const descMeta = document.querySelector('meta[name="description"]');
                    if (descMeta) data.description = descMeta.getAttribute('content');
                }

                return data;
            });

            if (earlyData.title) console.log(`[LinkedIn] 🕵️ Early Title found: ${earlyData.title.slice(0, 30)}...`);
            if (earlyData.description) console.log(`[LinkedIn] 🕵️ Early Description found (${earlyData.description.length} chars).`);
            if (earlyData.ldKeys && earlyData.ldKeys.length > 0) console.log(`[LinkedIn] JSON-LD Keys: ${earlyData.ldKeys.join(', ')}`);

            // --- 1. MODAL NUKE (Memory-safe: MutationObserver, no setInterval) ---
            await detailPage.evaluate(() => {
                const killModals = () => {
                    const elements = document.querySelectorAll('h1, h2, h3, div, p, span');
                    for (const el of Array.from(elements)) {
                        const text = (el.textContent || '').toLowerCase();
                        if (text.includes('sign in') && text.includes('already know')) {
                            let p = el.parentElement;
                            while (p) {
                                const style = window.getComputedStyle(p);
                                if (style.position === 'fixed' || style.position === 'absolute' || p.getAttribute('role') === 'dialog') {
                                    p.remove();
                                    break;
                                }
                                p = p.parentElement;
                            }
                        }
                    }
                    document.querySelectorAll('.artdeco-modal, .artdeco-modal__overlay').forEach(e => e.remove());
                    document.body.style.overflow = 'auto';
                };
                killModals();
                const observer = new MutationObserver(() => killModals());
                observer.observe(document.body, { childList: true, subtree: true });
            });
            for (let i = 0; i < 3; i++) { await detailPage.keyboard.press('Escape'); await detailPage.waitForTimeout(this.getJitteredDelay(250, 100)); }

            // --- 2. EXTRACTION (WITH GUEST FIXES + INFERENCE) ---

            const criteria = await detailPage.evaluate(() => {
                const res: any = {};
                document.querySelectorAll('.description__job-criteria-item').forEach(item => {
                    const header = item.querySelector('.description__job-criteria-subheader')?.textContent?.trim().toLowerCase();
                    const value = item.querySelector('.description__job-criteria-text')?.textContent?.trim();
                    if (header && value) {
                        if (header.includes('seniority')) res.experience = value;
                        if (header.includes('employment')) res.jobType = value;
                        if (header.includes('industries')) res.industry = value;
                        if (header.includes('function')) res.functions = value;
                    }
                });
                return res;
            });

            // Title/Company
            let title = earlyData.title || partialData.title;
            let company = earlyData.company || partialData.company_name;
            const domTitle = await detailPage.$('.top-card-layout__title');
            if (domTitle) {
                const t = (await domTitle.innerText()).trim();
                if (t && !t.includes('*****')) title = t;
            }
            const domComp = await detailPage.$('.top-card-layout__first-subline .topcard__org-name-link');
            if (domComp) {
                const c = (await domComp.innerText()).trim();
                if (c && !c.includes('*****')) company = c;
            }

            const isMasked = (str: string | null | undefined) => str && (str.includes('*****') || str.includes('****'));

            // Enhanced Easy Apply Detection
            // Key insight: LinkedIn uses "apply-link-onsite" for Easy Apply and "apply-link-offsite" for external apply
            let easyApply = false;
            try {
                easyApply = await detailPage.evaluate(() => {
                    // Primary Method: Check data-tracking-control-name attribute
                    // "apply-link-onsite" = Easy Apply (LinkedIn handles it)
                    // "apply-link-offsite" = External Apply (redirects to company site)
                    const onsiteButton = document.querySelector('[data-tracking-control-name*="apply-link-onsite"]');
                    if (onsiteButton) return true;

                    // Secondary: Check button classes
                    const applyButtons = document.querySelectorAll('.apply-button');
                    for (const btn of Array.from(applyButtons)) {
                        const trackingName = btn.getAttribute('data-tracking-control-name') || '';
                        if (trackingName.includes('onsite')) return true;
                    }

                    // Tertiary: Check page HTML for pattern
                    const pageHtml = document.body.innerHTML.toLowerCase();
                    if (pageHtml.includes('apply-link-onsite')) return true;

                    // Final fallback: Check for button text (less reliable for guests)
                    const buttons = Array.from(document.querySelectorAll('button'));
                    if (buttons.some(b => b.innerText.toLowerCase().includes('easy apply'))) return true;

                    return false;
                });
                console.log(`[LinkedIn] 📋 Easy Apply: ${easyApply ? 'Yes' : 'No'}`);
            } catch (e) {
                // If detection fails, default to false
                easyApply = false;
            }



            // --- SMART DESCRIPTION SPLIT & EXTRACTION ---
            let { description, requirements } = await detailPage.evaluate((mode) => {
                // REGEXE PATTERNS (Improved)
                // 1. Requirements: Matches "What you need", "Who you are", "Job Specs", "Qualifications", etc.
                const reqRegex = /^(requirement|qualification|skill|experience|competenc|profile|candidate|eligib|education|tech|job\s*spec|what\s*(you|we|will).*(need|bring|look|expect|own|success)|who\s*(you|are|will)|ideal\s*candidate|to\s*be\s*successful|qualities)/i;

                // 2. Description: Matches "Responsibilities", "About the job", "What you'll do", "Role Overview"
                const descRegex = /^(responsibilit|dutie|task|mission|role|position|purpose|summary|about\s*(the\s*job|us)|we\s*are|who\s*we\s*are|what\s*(you|we).*(do|make|work))/i;

                // 3. Footer: Matches "About Company", "Benefits", "Offer"
                const footerRegex = /^(about\s*[\w\s]{2,50}$|company\s*profile|working\s*at|benefits|offer|perks|package|why\s*join|is\s*this\s*you)/i;

                const container = document.querySelector('.show-more-less-html__markup') ||
                    document.querySelector('.description__text') ||
                    document.querySelector('.job-details-jobs-unified-top-card__primary-description-container') ||
                    document.querySelector('#job-details');

                if (!container) return { description: '', requirements: '' };

                // MODE A: RAW FULL DESCRIPTION
                if (mode === 'raw') {
                    let fullText: string[] = [];
                    function processNodeRaw(n: any) {
                        const t = n.textContent?.trim();
                        if (t && t.length > 1) fullText.push(t);
                    }
                    if (container.children.length > 0) Array.from(container.children).forEach(processNodeRaw);
                    else Array.from(container.childNodes).forEach(processNodeRaw);

                    const rawClean = fullText
                        .map(l => l.replace(/^[\s\u00A0]*[-•*]?[\s\u00A0]*/, '').trim())
                        .filter(l => l.length > 2)
                        .map(l => `• ${l}`)
                        .join('\n');
                    return { description: rawClean, requirements: '' };
                }

                let descLines: any[] = [];
                let reqLines: any[] = [];
                let footerLines: any[] = []; // Trash bin for company footer
                let target = descLines; // Default bucket

                // State Machine
                let isFooter = false;

                function processNode(n: any) {
                    if (isFooter) return; // Stop processing if we hit footer

                    // 1. Text Nodes
                    if (n.nodeType === Node.TEXT_NODE) {
                        const t = n.textContent?.trim();
                        if (t && t.length > 1) target.push(t);
                        return;
                    }

                    const el = n;
                    const tagName = el.tagName;
                    let text = el.innerText?.trim() || '';
                    if (!text) return;

                    // 2. Header Detection (Expanded)
                    let isHeader = ['STRONG', 'B', 'H1', 'H2', 'H3', 'H4', 'H5', 'U'].includes(tagName);

                    // P > Strong pattern
                    if (tagName === 'P' && el.children.length === 1 && ['STRONG', 'B'].includes(el.children[0].tagName)) isHeader = true;

                    // "Question Header" or "Colon Header" logic
                    // e.g. "What we need:" or "Who are you?"
                    if (!isHeader && text.length < 60) {
                        if (text.endsWith(':') || text.endsWith('?') || /^[A-Z][a-z\s]+$/.test(text)) {
                            // Only treat as header if it matches keywords slightly
                            if (reqRegex.test(text) || descRegex.test(text) || footerRegex.test(text)) isHeader = true;
                        }
                    }

                    if (isHeader) {
                        // Footer Check First (stop greedy match)
                        // If we are in Req mode, and see "About Us", switch to footer
                        if (footerRegex.test(text) && target === reqLines) {
                            isFooter = true;
                            return;
                        }

                        if (reqRegex.test(text)) {
                            target = reqLines;
                            target.push(text);
                            return;
                        } else if (descRegex.test(text)) {
                            target = descLines;
                            target.push(text);
                            return;
                        } else if (text.toLowerCase().includes('requirement') || text.toLowerCase().includes('qualification')) {
                            // Fallback strict keyword
                            target = reqLines;
                            target.push(text);
                            return;
                        }
                    }

                    // 3. List Handling
                    if (tagName === 'LI') {
                        target.push(`• ${text}`);
                    } else if (['UL', 'OL'].includes(tagName)) {
                        Array.from(el.children).forEach((li: any) => target.push(`• ${(li).innerText.trim()}`));
                    } else {
                        target.push(text);
                    }
                }

                if (container.children.length > 0) {
                    Array.from(container.children).forEach(processNode);
                } else {
                    Array.from(container.childNodes).forEach(processNode);
                }

                // --- CLEANUP HELPER ---
                const clean = (arr: any[]) => {
                    return arr
                        .map(l => {
                            // Remove leading symbols and whitespace
                            let cleanLine = l.replace(/^[\s\u00A0]*[-•*]?[\s\u00A0]*/, '').trim();

                            // Remove headers that slipped in (Double check regex)
                            if (cleanLine.length < 60 && (reqRegex.test(cleanLine) || descRegex.test(cleanLine))) return null;

                            return cleanLine;
                        })
                        .filter(l => l && l.length > 5 && l !== 'Description') // Explicitly remove "Description" label
                        .map(l => `• ${l}`)
                        .join('\n');
                };

                let finalReq = clean(reqLines);
                let finalDesc = clean(descLines);

                // --- HEURISTIC FALLBACK ---
                // If Reqs are empty (< 50 chars) and Description is long, try to find list items in Description
                if (finalReq.length < 50 && descLines.length > 5) {
                    // Look for lines in description that seem like requirements (bullets with keywords)
                    const keywords = /experience|year|skill|ability|knowledge|degree|bachelor|master|fluent|command|communication|work|prefer|plus|must|proficien/i;

                    // Filter lines from raw description array that match criteria
                    const potentialReqs = descLines.filter(l => {
                        const cleanL = l.replace(/^[\s\u00A0]*[-•*]?[\s\u00A0]*/, '').trim();
                        return (cleanL.startsWith('•') || cleanL.startsWith('-') || l.includes('•')) && keywords.test(cleanL);
                    });

                    if (potentialReqs.length >= 2) {
                        // If we found a good number of candidates, use them as Requirements
                        // We append them to whatever was in finalReq (if any)
                        const recovered = clean(potentialReqs);
                        if (recovered.length > finalReq.length) {
                            finalReq = recovered;
                            // Optional: Remove them from description? Keeping them is safer for now.
                        }
                    }
                }

                return {
                    description: finalDesc,
                    requirements: finalReq
                };
            }, process.env.SPLIT_MODE || 'smart');

            if (requirements) console.log(`[LinkedIn] 📋 Extracted Requirements: ${requirements.length} chars`);


            // --- 3. MASK DETECTION & RECOVERY ---

            // Fallback to earlyData if DOM is masked
            if (!description || isMasked(description)) {
                if (earlyData.description) {
                    console.log('[LinkedIn] 🛡️ DOM is masked, but recovering description from JSON-LD.');
                    // JSON-LD description might contain HTML, we do a basic strip
                    description = earlyData.description.replace(/<[^>]*>?/gm, '\n').replace(/\n\s*\n/g, '\n');
                }
            }

            if (isMasked(title) || isMasked(company) || (!description || isMasked(description))) {
                this.consecutiveMasks++;
                console.warn(`[LinkedIn] 🛑 MASKED DATA Detected (Count: ${this.consecutiveMasks}). Attempting aggressive bypass...`);
                await detailPage.close().catch(() => {});

                // Aggressive bypass: Always hard reset on mask detection because flagged sessions rarely recover
                console.log('[Anti-Mask] 🧼 Performing Hard Reset (New Browser Context)...');
                await this.initBrowser(true);
                
                // Short random delay to seem more human-like before retry
                const delay = this.getJitteredDelay(5000, 3000);
                console.log(`[Anti-Mask] ⏳ Waiting ${Math.round(delay/1000)}s before retry...`);
                await new Promise(r => setTimeout(r, delay));

                return this.scrapeJobDetail(jobId, partialData, attempt + 1);
            }

            this.consecutiveMasks = 0;


            // --- 4. INFERENCE (Zero Empty Columns) ---

            if (!criteria.experience) {
                criteria.experience = 'Not Specified';
            }

            let inferredExperienceNeeded = '';
            const expMatch = description.match(/(\d+)\+?\s*years?/i);
            if (expMatch) inferredExperienceNeeded = `${expMatch[1]} Years`;

            if (!criteria.industry) {
                const text = description.toLowerCase();
                if (text.includes('software') || text.includes('developer') || text.includes('it')) criteria.industry = 'IT Services';
                else if (text.includes('sales') || text.includes('marketing')) criteria.industry = 'Marketing & Sales';
                else if (text.includes('engineer') || text.includes('mechanical')) criteria.industry = 'Engineering';
                else if (text.includes('pharmacy') || text.includes('medical')) criteria.industry = 'Healthcare';
                else criteria.industry = 'General Business';
            }

            if (!criteria.jobType) {
                const text = description.toLowerCase();
                if (text.includes('full-time') || text.includes('full time')) criteria.jobType = 'Full-time';
                else if (text.includes('part-time')) criteria.jobType = 'Part-time';
                else if (text.includes('contract')) criteria.jobType = 'Contract';
                else criteria.jobType = 'Full-time';
            }

            // --- 5. EXTRACT POSTED TIME & APPLICANTS ---

            // A. Applicants (Robust with Fallback)
            let applicantsText: string | null = null;
            try {
                // Try modern Locator approach (Wait 2s max)
                // @ts-ignore
                const loc = detailPage.locator('.num-applicants__caption, .job-details-jobs-unified-top-card__applicant-count, .tvm__text--low-emphasis, .job-view-layout span:has-text("applicant")').first();
                try { await loc.waitFor({ state: 'attached', timeout: 2000 }); } catch (e) { }
                applicantsText = await loc.innerText().catch(() => null);

                // Fallback: Body Text Regex
                if (!applicantsText) {
                    const body = await detailPage.innerText('body');
                    const match = body.match(/(\d+)\s*applicants?/i);
                    if (match) applicantsText = match[0];
                    else if (body.includes('Be among the first 25 applicants')) applicantsText = '25';
                }
            } catch (e) { console.warn('[LinkedIn] Applicants extraction failed', e); }

            let applicantsCount = 0;
            if (applicantsText) {
                const match = applicantsText.match(/(\d+)/);
                applicantsCount = match ? parseInt(match[1]) : 0;
            }

            // B. Posted Time
            let postedTime = new Date().toISOString(); // Fallback to scraping time
            try {
                const relativeTimeText = await detailPage.evaluate(() => {
                    // LinkedIn shows "X hours ago", "X days ago", etc. in multiple possible locations
                    const selectors = [
                        '.posted-time-ago__text',
                        '.topcard__flavor--bullet',
                        '.job-details-jobs-unified-top-card__primary-description-container span',
                        '.jobs-unified-top-card__posted-date'
                    ];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el) {
                            const text = el.textContent?.trim() || '';
                            // Check if it contains time-related keywords
                            if (text.match(/(hour|day|week|month|year|minute)/i)) {
                                return text;
                            }
                        }
                    }
                    // Fallback: search entire page for pattern like "X hours ago"
                    const pageText = document.body.innerText;
                    const match = pageText.match(/(\d+\s*(hour|day|week|month|year|minute)s?\s*ago)/i);
                    return match ? match[0] : null;
                });

                if (relativeTimeText) {
                    postedTime = convertRelativeTimeToDate(relativeTimeText);
                    console.log(`[LinkedIn] 📅 Posted: ${relativeTimeText} → ${postedTime.slice(0, 10)}`);
                }
            } catch (e) {
                // Keep fallback
            }

            // Success
            const entity: JobEntity = {
                source_job_id: jobId, job_id: jobId, url: url,
                title: title, company_name: company, company_url: '',
                location: partialData.location,
                posted_time: postedTime, source: 'LinkedIn',

                job_type: criteria.jobType,
                work_type: partialData.list_work_mode || (description.toLowerCase().includes('remote') ? 'Remote' : 'On-site'),
                work_mode: partialData.list_work_mode || (description.toLowerCase().includes('remote') ? 'Remote' : 'On-site'),

                experience_needed: inferredExperienceNeeded,
                experience_level: criteria.experience,
                industry: criteria.industry,

                easy_apply: easyApply ? 'Yes' : 'No',
                career_level: criteria.experience, education_level: 'Bachelor Degree',
                salary: null,
                job_categories: criteria.functions || 'General',
                skills: 'Not Specified',
                description: description, requirements: requirements,
                job_status: 'Open', open_positions: 1, viewed: 0, in_consideration: 0, not_selected: 0,
                applicants: applicantsCount,
                scraped_at: new Date()
            };

            await detailPage.close();
            return entity;

        } catch (e) {
            console.error(`[LinkedIn] Error ${jobId} (Attempt ${attempt})`, e);
            if (detailPage) await detailPage.close().catch(() => { });
            return null;
        }
    }
    public async scrapeSpecificPage(offset: number, strictSkipUrls?: Set<string>): Promise<any> { return { jobs: [], foundCards: 0 }; }
    private async scrapeJobDetails(url: string): Promise<any> { return {}; }
    public async fetchTotalJobs(): Promise<number> { return 50000; }
    public async isJobClosed(url: string): Promise<boolean> { return false; }
    protected async scrapeJobs(options?: any): Promise<JobEntity[]> { return []; }
    public async close() { if (this.browser) await this.browser.close(); }
}
