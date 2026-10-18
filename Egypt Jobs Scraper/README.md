# 💼 Hire Q - Advanced Job Aggregator Engine

> **⚠️ Status: Active Development (Enterprise Edition v3.0)**
> *A high-performance, fault-tolerant job aggregation engine designed for the Egyptian market. Targeting **Wuzzuf** and **LinkedIn**, with a focus on data quality, duplicate prevention, and zero-maintenance operation.*

---

## 📖 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module 1: Wuzzuf Scraper (Complete Guide)](#module-1-wuzzuf)
3. [Module 2: LinkedIn Scraper (Complete Guide)](#module-2-linkedin)
4. [Core Components](#core-components)
5. [Network Health & Resilience](#network-health)
6. [Data Pipeline & Integrity](#data-pipeline)
7. [Setup & Usage](#setup)
8. [Project Structure](#project-structure)

---

## <a name="architecture-overview"></a>🏗️ Architecture Overview

The system consists of two independent scraper modules, each with its own manager:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HIRE Q - JOB AGGREGATOR ENGINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────┐       ┌──────────────────────────┐           │
│  │   GlobalManager.ts       │       │   LinkedInManager.ts     │           │
│  │   (Wuzzuf Controller)    │       │   (LinkedIn Controller)  │           │
│  └────────────┬─────────────┘       └────────────┬─────────────┘           │
│               │                                  │                          │
│               ▼                                  ▼                          │
│  ┌──────────────────────────┐       ┌──────────────────────────┐           │
│  │   WuzzufScraper.ts       │       │ LinkedInBrowserScraper.ts│           │
│  │   - Hybrid Fetching      │       │   - Playwright Stealth   │           │
│  │   - API + Browser Mix    │       │   - Proxy Rotation       │           │
│  └────────────┬─────────────┘       └────────────┬─────────────┘           │
│               │                                  │                          │
│               └──────────────┬───────────────────┘                          │
│                              ▼                                              │
│                 ┌──────────────────────────┐                                │
│                 │     JobCollector.ts      │                                │
│                 │   - Deduplication        │                                │
│                 │   - CSV Management       │                                │
│                 │   - State Persistence    │                                │
│                 └──────────────────────────┘                                │
│                              │                                              │
│                              ▼                                              │
│                 ┌──────────────────────────┐                                │
│                 │      BaseScraper.ts      │                                │
│                 │   - Context Pooling      │                                │
│                 │   - Rate Limit Handling  │                                │
│                 │   - Resource Blocking    │                                │
│                 └──────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## <a name="module-1-wuzzuf"></a>🚀 Module 1: Wuzzuf Scraper v3.1 (Hybrid Turbo Edition)

### 📋 Overview

The Wuzzuf module is designed to scrape **7,000+ jobs** from Wuzzuf.net efficiently using a revolutionary **Hybrid Fetching Strategy** that combines the accuracy of browser automation with the speed of direct API requests.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     WUZZUF SCRAPING FLOW                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GlobalManager.ts                                               │
│  ═══════════════                                                │
│  Entry point for Wuzzuf scraping                                │
│                                                                 │
│  • Initializes Cleaner for pre-flight CSV cleanup               │
│  • Loads "Knowledge Base" (existing job IDs from CSV)           │
│  • Creates WuzzufScraper instance (no category filter)          │
│  • Creates JobCollector with CSV path                           │
│  • Runs infinite loop: scrape → sleep 10 min → repeat           │
│  • Handles crash recovery with 30-second restart delay          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  JobCollector.ts                                                │
│  ═══════════════                                                │
│  Manages the scraping cycle and CSV operations                  │
│                                                                 │
│  runCycle():                                                    │
│  ├── 1. Fetch total job count from Wuzzuf                       │
│  ├── 2. Calculate pages to scan (totalJobs / 15 per page)       │
│  ├── 3. For each page (0 → N):                                  │
│  │      ├── Call scraper.scrapeSpecificPage(page)               │
│  │      ├── Filter out duplicates using Knowledge Base          │
│  │      ├── Save new jobs to CSV                                │
│  │      └── Check for "Smart Stop" conditions                   │
│  └── 4. Return stats (newJobs, pagesScanned, stoppedReason)     │
│                                                                 │
│  Smart Stop Triggers:                                           │
│  • 3 consecutive pages with 0 new jobs                          │
│  • Infinite loop detection (same first job ID)                  │
│  • Network failure after 5 retries                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  WuzzufScraper.ts                                               │
│  ═════════════════                                              │
│  The actual scraping logic                                      │
│                                                                 │
│  Fields:                                                        │
│  ├── name = 'Wuzzuf'                                            │
│  ├── baseUrl = 'https://wuzzuf.net'                             │
│  ├── visitedFirstIds = Set<string>  // Loop detection           │
│  └── categoryFilter = ''  // Optional category filter           │
│                                                                 │
│  Key Methods:                                                   │
│  ├── fetchTotalJobs()     → Gets total job count                │
│  ├── scrapeSpecificPage() → Scrapes one page of results         │
│  ├── cleanText()          → Sanitizes text from HTML            │
│  └── isJobClosed()        → Checks if job is still open         │
└─────────────────────────────────────────────────────────────────┘
```

### 📦 scrapeSpecificPage() - Detailed Breakdown

This is the **heart of the Wuzzuf scraper**. Here's exactly what it does:

```typescript
public async scrapeSpecificPage(page: number, strictSkipUrls?: Set<string>)
```

**Step 1: Build Search URL**
```
https://wuzzuf.net/search/jobs/?a=hpb&filters[country][0]=Egypt&start={page}
```
- `a=hpb` → Source identifier
- `filters[country][0]=Egypt` → Strict Egypt filter
- `start={page}` → Page number (0-indexed)

**Step 2: Fetch HTML (via BaseScraper.fetchHtml)**
```typescript
html = await this.fetchHtml(searchUrl);
```
Uses Playwright with JS enabled for search pages (needed to render job cards).

**Step 3: Parse Job Cards**
```typescript
const $ = cheerio.load(html);
const jobCards = $('.e1v1l3u10');  // Wuzzuf's job card class
```
Cheerio parses the HTML and selects all job card elements.

**Step 4: Infinite Loop Protection**
```typescript
if (page === 0) this.visitedFirstIds.clear();
const firstJobId = extractIdFromFirstCard();
if (this.visitedFirstIds.has(firstJobId) && page > 0) {
    return { jobs: [], foundCards: 0 };  // STOP!
}
this.visitedFirstIds.add(firstJobId);
```
Wuzzuf sometimes returns the same page repeatedly for high page numbers. This detects and stops the loop.

**Step 5: Hybrid Detail Fetching**
```typescript
// For each job card:
const detailHtml = await this.fetchHtml(fullUrl, { enableJs: false });
```
**Key Innovation**: Detail pages are fetched **without JavaScript** using Playwright's API request (not browser navigation). This is 3-4x faster!

**Step 6: Extract JSON State**
```typescript
const match = content.match(/Wuzzuf\.initialStoreState\s*=\s*(\{[\s\S]*?\});/);
const state = JSON.parse(match[1]);
const jobData = state.entities.job.collection[jobId];
```
Wuzzuf embeds all job data in a JavaScript object. We extract and parse it directly!

**Step 7: Data Mapping**
```typescript
const job: JobEntity = {
    source_job_id: sourceId,
    title: attrs.title,
    company_name: companyData.attributes.name,
    location: [locArea, locCity].join(', '),
    salary: formatSalary(attrs.salary),
    work_type: detectWorkType(attrs),
    description: cleanText(attrs.description),
    requirements: cleanText(attrs.requirements),
    skills: attrs.keywords.map(k => k.name).join(', '),
    applicants: attrs.applicationsCount,
    views: attrs.viewsCount,
    // ... 20+ more fields
};
```

**Step 8: Batch Processing**
```typescript
// Process in batches of 5 with 1.5s delay between batches
for (let i = 0; i < allElements.length; i += batchSize) {
    const batch = allElements.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(el => processCard(el)));
    await new Promise(r => setTimeout(r, 1500));  // Avoid 429
}
```

### 🎯 cleanText() - Text Sanitization

```typescript
private cleanText(text: string | undefined | any): string {
    return text
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')  // Remove CSS
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove JS
        .replace(/<br\s*\/?>/gi, '\n')                    // BR → newline
        .replace(/<\/p>/gi, '\n\n')                       // P → double newline
        .replace(/<[^>]+>/g, ' ')                         // Strip all tags
        .replace(/&nbsp;/g, ' ')                          // HTML entities
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')                             // Collapse whitespace
        .trim();
}
```

### ⚡ Performance Metrics

| Metric | v2.0 (Old) | v3.1 (Turbo) | Improvement |
|--------|------------|--------------|-------------|
| **Job Detail Fetch** | ~2s (full browser) | ~0.8s (API) | **60% faster** |
| **Page (19 jobs)** | ~40s | ~15s | **62% faster** |
| **7000+ Jobs** | ❌ Crashed | ✅ ~4 hours | **Works!** |
| **Memory Usage** | ~800MB | ~400MB | **50% less** |

### 🔄 Rate Limit Handling (BaseScraper.ts)

```typescript
// Auto-retry with exponential backoff
if (response.status() === 429) {  // Rate limited
    const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000);
    // Wait: 5s → 10s → 20s → 30s (max)
    await new Promise(r => setTimeout(r, waitTime));
    continue;  // Retry
}

if (response.status() === 502 || response.status() === 503) {  // Server error
    const waitTime = 3000 * (attempt + 1);
    // Wait: 3s → 6s → 9s
    await new Promise(r => setTimeout(r, waitTime));
    continue;
}
```

### 📊 Output Fields

The Wuzzuf scraper extracts **23 fields** per job:

| Field | Example | Source |
|-------|---------|--------|
| source_job_id | `ABC123` | URL regex |
| title | `Senior Developer` | `attrs.title` |
| company_name | `Vodafone Egypt` | `companyData.attributes.name` |
| company_url | `https://wuzzuf.net/jobs/careers/vodafone` | `companyData.attributes.profile` |
| location | `Cairo, Egypt` | `attrs.location.city.name` |
| posted_time | `2024-01-15T10:30:00` | `attrs.postedAt` |
| work_type | `Remote` / `Hybrid` / `On-site` | `attrs.workplaceArrangement` |
| experience_needed | `3-5 years` | `attrs.workExperienceYears` |
| career_level | `Experienced` | `attrs.careerLevel.name` |
| education_level | `Bachelor's Degree` | `attrs.candidatePreferences.educationLevel` |
| salary | `15000-25000 EGP Monthly` | `attrs.salary` |
| description | `We are looking for...` | `attrs.description` → cleanText() |
| requirements | `Must have 5 years...` | `attrs.requirements` → cleanText() |
| skills | `Python, React, AWS` | `attrs.keywords` |
| job_status | `Open` / `Closed` | `attrs.status` |
| applicants | `150` | `attrs.applicationsCount` |
| views | `2500` | `attrs.viewsCount` |
| open_positions | `3` | `attrs.vacancies` |

---

## <a name="module-2-linkedin"></a>🔥 Module 2: LinkedIn Scraper (Enterprise v3.0)

### 📋 Overview

The LinkedIn module is a **full-browser automation solution** that uses Playwright in stealth mode to scrape LinkedIn's public job listings. It features intelligent keyword scheduling, proxy rotation, and automatic recovery from anti-bot measures.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LINKEDIN SCRAPING FLOW                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  LinkedInManager.ts                                             │
│  ═══════════════════                                            │
│  The Enterprise Controller                                      │
│                                                                 │
│  Initialization:                                                │
│  ├── Load state from linkedin_state.json                        │
│  ├── Load 200+ keywords with priority assignments               │
│  ├── Activate KeepAwake (prevent system sleep)                  │
│  ├── Verify network connectivity                                │
│  └── Create SmartKeywordScheduler                               │
│                                                                 │
│  Main Loop (Infinite):                                          │
│  ├── 1. Get keywords for current time session                   │
│  ├── 2. For each keyword:                                       │
│  │      ├── Wait for network if disconnected                    │
│  │      ├── Discover jobs (scroll through results)              │
│  │      ├── For each new job:                                   │
│  │      │      ├── Navigate to detail page                      │
│  │      │      ├── Extract all fields                           │
│  │      │      ├── Handle anti-bot modals                       │
│  │      │      └── Save to CSV                                  │
│  │      ├── Update keyword stats                                │
│  │      └── Cooldown (8 seconds)                                │
│  ├── 3. Retry failed jobs from queue                            │
│  ├── 4. Save state                                              │
│  └── 5. Sleep 10 minutes → Repeat                               │
└─────────────────────────────────────────────────────────────────┘
```

### 🔑 Keyword Database (200+ Keywords)

Keywords are organized by **priority** and **category**:

```typescript
interface KeywordConfig {
    keyword: string;           // Search term
    priority: 'high' | 'medium' | 'low';
    category: string;          // Grouping
    lastScraped?: string;      // ISO timestamp
    totalJobsFound: number;    // Lifetime count
    lastJobsFound: number;     // Last run count
}
```

**Category Breakdown:**

| Category | Count | Examples |
|----------|-------|----------|
| Core | 5 | Jobs, Hiring, Vacancies |
| Tech | 30+ | Python, React, AWS, DevOps |
| Data & AI | 8 | Data Scientist, ML, Analytics |
| Sales | 7 | Sales, Business Development |
| Marketing | 8 | Digital Marketing, Growth |
| HR & Admin | 7 | HR, Recruiter, Admin |
| Finance | 8 | Accountant, Auditor, Tax |
| Operations | 10 | Logistics, Supply Chain |
| Engineering | 7 | Civil, Mechanical, Electrical |
| Medical | 8 | Doctor, Nurse, Pharmacist |
| Design | 7 | UI/UX, Graphic Designer |
| Legal | 4 | Lawyer, Compliance |
| Support | 8 | Customer Service, Call Center |
| Industry | 20+ | Banking, Fintech, Pharmaceutical |
| WorkType | 8 | Remote, Internship, Fresh Graduate |
| Location | 7 | Cairo, Alexandria, Smart Village |
| Arabic | 4 | وظائف, مطلوب, توظيف |

### ⏰ SmartKeywordScheduler

The scheduler selects keywords based on time of day:

```typescript
class SmartKeywordScheduler {
    getSessionKeywords(): KeywordConfig[] {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 12) {
            // MORNING: HIGH priority only (~55 keywords)
            return this.keywords.filter(k => k.priority === 'high');
        }
        else if (hour >= 12 && hour < 18) {
            // AFTERNOON: HIGH + MEDIUM (~130 keywords)
            return this.keywords.filter(k => 
                k.priority === 'high' || k.priority === 'medium'
            );
        }
        else {
            // NIGHT: Full coverage (~200 keywords)
            return [...this.keywords];
        }
    }
}
```

**Sorting Algorithm:**
```typescript
keywords.sort((a, b) => {
    // 1. Priority (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    
    // 2. Performance (more jobs = higher rank)
    if (a.lastJobsFound !== b.lastJobsFound) {
        return b.lastJobsFound - a.lastJobsFound;
    }
    
    // 3. Least recently scraped first
    return new Date(a.lastScraped || 0) - new Date(b.lastScraped || 0);
});
```

### 📦 LinkedInBrowserScraper.ts - Detailed Breakdown

#### initBrowser() - Stealth Configuration

```typescript
private async initBrowser(forceReset = false) {
    this.browser = await chromium.launch({
        headless: true,  // Invisible
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',  // Hide automation
            '--window-size=1920,1080'
        ]
    });
    
    this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'Africa/Cairo',
    });
    
    // Critical Stealth Overrides
    await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.navigator.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
    });
}
```

#### discoverJobs() - Job Discovery

```typescript
public async discoverJobs(keyword: string): Promise<PartialJob[]> {
    // 1. Navigate to search results
    const url = `https://linkedin.com/jobs/search?keywords=${keyword}&location=Egypt&sortBy=DD`;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // 2. Infinite scroll to load all jobs
    for (let i = 0; i < MAX_SCROLL_LOOPS; i++) {
        // Find all job cards on page
        const cards = await this.page.$$('.base-card, .job-search-card');
        
        for (const card of cards) {
            // Extract basic info from card
            const href = await card.$eval('a.base-card__full-link', a => a.href);
            const jobId = extractJobId(href);  // Regex: /view/.*-(\d{7,})/
            
            // Skip if already in Knowledge Base
            if (this.processedIds.has(jobId)) continue;
            
            discovered.set(jobId, {
                source_job_id: jobId,
                url: href,
                title: await card.$eval('.base-search-card__title', el => el.innerText),
                company_name: await card.$eval('.base-search-card__subtitle', el => el.innerText),
                location: await card.$eval('.job-search-card__location', el => el.innerText),
            });
        }
        
        // Scroll down
        await this.page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await this.page.waitForTimeout(2000);
        
        // Click "Show More" button if stuck
        if (stuckCount > 3) {
            await this.page.click('button.infinite-scroller__show-more-button');
        }
    }
    
    return Array.from(discovered.values());
}
```

#### scrapeJobDetail() - Detail Extraction

```typescript
public async scrapeJobDetail(jobId: string, partialData: PartialJob): Promise<JobEntity | null> {
    const url = `https://www.linkedin.com/jobs/view/${jobId}/`;
    await detailPage.goto(url, { waitUntil: 'domcontentloaded' });
    
    // 1. NUKE MODALS (LinkedIn loves sign-in popups)
    await detailPage.evaluate(() => {
        document.querySelectorAll('[role="dialog"]').forEach(el => el.remove());
        document.querySelectorAll('.artdeco-modal').forEach(el => el.remove());
        document.body.style.overflow = 'auto';  // Re-enable scrolling
    });
    
    // 2. Extract job criteria
    const criteria = await detailPage.evaluate(() => {
        const res = {};
        document.querySelectorAll('.description__job-criteria-item').forEach(item => {
            const header = item.querySelector('.description__job-criteria-subheader').textContent;
            const value = item.querySelector('.description__job-criteria-text').textContent;
            if (header.includes('seniority')) res.experience = value;
            if (header.includes('employment')) res.jobType = value;
            if (header.includes('industries')) res.industry = value;
        });
        return res;
    });
    
    // 3. Detect Easy Apply
    const easyApply = await detailPage.evaluate(() => {
        return document.body.innerText.toLowerCase().includes('easy apply');
    });
    
    // 4. Extract description
    const description = await detailPage.$eval('.show-more-less-html__markup', el => el.textContent);
    
    // 5. MASK DETECTION (LinkedIn hiding data)
    if (title.includes('*****') || description.includes('****')) {
        this.consecutiveMasks++;
        if (this.consecutiveMasks > 2) {
            await this.initBrowser(true);  // Hard reset
        }
        return null;  // Skip this job
    }
    
    // 6. Inference (fill missing fields from description)
    if (!criteria.experience) {
        const match = description.match(/(\d+)\+?\s*years?/i);
        criteria.experience = match ? `${match[1]} Years` : 'Entry Level';
    }
    
    return {
        source_job_id: jobId,
        title, company_name: company,
        location: partialData.location,
        job_type: criteria.jobType,
        experience_level: criteria.experience,
        industry: criteria.industry,
        easy_apply: easyApply ? 'Yes' : 'No',
        description,
        // ... more fields
    };
}
```

### 🛡️ Anti-Ban Protections

| Protection | Implementation |
|------------|----------------|
| **Stealth Mode** | `navigator.webdriver = undefined` |
| **Real User Agent** | Chrome 120 on Windows 10 |
| **Random Delays** | 2-5 seconds between job details |
| **Keyword Cooldown** | 8 seconds between keywords |
| **Cycle Sleep** | 10 minutes between full cycles |
| **Mask Detection** | Auto-detect `*****` and reset browser |
| **Proxy Rotation** | Load from `data/proxies.txt` |
| **Modal Nuking** | Auto-close sign-in popups every 500ms |

### 📥 Failed Job Retry Queue

```typescript
interface FailedJob {
    jobId: string;
    partialJob: any;
    failedAt: string;
    retryCount: number;  // Max 5 attempts
    lastError: string;
}

class FailedJobManager {
    addFailedJob(job: PartialJob, error: string) {
        this.queue.push({
            jobId: job.source_job_id,
            partialJob: job,
            failedAt: new Date().toISOString(),
            retryCount: 0,
            lastError: error
        });
    }
    
    getJobsToRetry(): FailedJob[] {
        return this.queue.filter(job => job.retryCount < 5);
    }
}
```

Jobs are retried after all keywords in a cycle are processed.

---

## <a name="module-3-indeed"></a>🚀 Module 3: Indeed Scraper v5.0 (Python-Powered)

### 📋 Overview

The Indeed module is a specialized, high-resilience scraper that bypasses Indeed's aggressive Cloudflare protections using a **Hybrid Node.js + Python Architecture**. It leverages `undetected-chromedriver` in Python for browser automation while maintaining the robust orchestration and data management of the Node.js ecosystem.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INDEED SCRAPING FLOW                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  IndeedManagerV5.ts (Node.js)                                   │
│  ════════════════════════════                                   │
│  The Orchestrator                                               │
│                                                                 │
│  • Manages the scraping lifecycle                               │
│  • Handles job queue and state persistence                      │
│  • Spawns and controls the Python Worker                        │
│  • Detects blocks and triggers profile rotation                 │
│                                                                 │
│  Communication: JSON over Stdio                                 │
│  Node sends: { cmd: "discover", keyword: "Jobs", ... }          │
│  Python replies: { jobs: [...], blocked: false }                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  indeed_scraper.py (Python)                                     │
│  ══════════════════════════                                     │
│  The Stealth Worker                                             │
│                                                                 │
│  • Uses `undetected-chromedriver` to bypass Cloudflare          │
│  • Runs in strict JSON protocol mode                            │
│  • Fetches search results and job details                       │
│  • Reports "Cloudflare Challenges" back to Node instantly       │
└─────────────────────────────────────────────────────────────────┘
```

### 🛡️ Persistent Blocking Resolution

Indeed employs aggressive, stateful blocking. Raising a block often flags the browser profile. We solved this with **Profile Rotation**:

1.  **Detection**: If the Python worker reports a block (e.g., Cloudflare challenge loop), the Node.js manager catches it.
2.  **Reaction**: The manager immediately kills the Python process.
3.  **Rotation**: The `cleanupSystem()` function **deletes the Chrome profile directory** (`data/indeed_uc_profile`).
4.  **Restart**: A fresh Python worker is spawned with a brand-new, unflagged browser profile.
5.  **Resume**: Scraping continues from the next query items.

### 📊 Output Schema (CSV)

The scraper outputs to `data/indeed_jobs.csv` with the following schema:

| Field | Description |
|-------|-------------|
| **Job Title** | Title of the position |
| **Company Name** | Name of the hiring company |
| **Location** | Job location (City, Area) |
| **Posted Date Raw** | e.g., "Just posted", "3 days ago" |
| **Job URL** | Direct link to the job post |
| **Description** | Full job description text |
| **Job Type** | Full-time, Part-time, Contract, etc. |
| **Career Level** | Junior, Senior, Manager, etc. (Inferred) |
| **Work Type** | Remote, Hybrid, On-site |
| **Years of Experience** | e.g., "1-3 Years" (Inferred) |
| **And more...** | Job Key, Source, Keywords... |

### 🚀 Usage

To run the Indeed V5 scraper:

```bash
npm run start:indeed:v5
```

Monitor the logs:

```bash
tail -f output.log
```

---

## <a name="core-components"></a>🧩 Core Components

### BaseScraper.ts

The abstract base class that both Wuzzuf and LinkedIn scrapers extend.

**Key Features:**

| Feature | Description |
|---------|-------------|
| **Context Pool** | 5 reusable browser contexts for parallel requests |
| **Resource Blocking** | Blocks images, CSS, fonts to speed up loading |
| **Cookie Capture** | Stores session cookies for Axios fallback |
| **Rate Limit Retry** | Exponential backoff on 429/502/503 errors |

```typescript
// Context Pool for fast No-JS requests
private async getNoJsContext() {
    const ctx = this.contextPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.poolSize;  // Round robin
    return ctx;
}

// Resource blocking for speed
await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        return route.abort();  // Don't load
    }
    return route.continue();
});
```

### JobCollector.ts

Manages CSV operations and deduplication.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `validateHeaders()` | Checks CSV integrity on startup |
| `loadProcessedUrls()` | Builds Knowledge Base from existing CSV |
| `runCycle()` | Orchestrates page-by-page scraping |
| `saveJobs()` | Appends new jobs to CSV with sanitization |

```typescript
// CSV Sanitization (prevents row corruption)
value = value.toString();
value = value.replace(/[\r\n]+/g, ' ');  // Remove newlines
value = value.replace(/\s+/g, ' ').trim();  // Collapse whitespace
value = value.replace(/"/g, '""');  // Escape quotes
return `"${value}"`;
```

---

## <a name="network-health"></a>🌐 Network Health & Resilience

### NetworkHealthCheck.ts

A singleton utility that monitors internet connectivity:

```typescript
class NetworkHealthCheck {
    // Check connectivity via DNS + HTTPS
    async checkNetwork(): Promise<boolean> {
        try {
            // Try DNS resolution
            await dns.resolve('linkedin.com');
            return true;
        } catch {
            // Fallback: Try HTTPS request
            return await this.httpsCheck('google.com');
        }
    }
    
    // Wait for network recovery
    async waitForNetwork(): Promise<void> {
        while (!await this.checkNetwork()) {
            console.log('[Network] ⏳ Waiting for connection...');
            await new Promise(r => setTimeout(r, 10000));
        }
    }
    
    // Identify network errors
    isNetworkError(error: Error): boolean {
        const patterns = [
            'ERR_INTERNET_DISCONNECTED',
            'ERR_NAME_NOT_RESOLVED',
            'ERR_CONNECTION_TIMED_OUT',
            'ETIMEDOUT', 'ENOTFOUND'
        ];
        return patterns.some(p => error.message.includes(p));
    }
    
    // Wrap operations with retry
    async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (this.isNetworkError(error)) {
                    await this.waitForNetwork();
                    continue;  // Retry
                }
                throw error;
            }
        }
    }
}
```

### KeepAwake.ts

Prevents system sleep on Windows:

```typescript
class KeepAwake {
    start() {
        // Method 1: Periodic mouse movement simulation
        this.interval = setInterval(() => {
            exec('powershell -command "[System.Windows.Forms.Cursor]::Position"');
        }, 60000);
        
        // Method 2: Power settings (requires admin)
        exec('powercfg /change standby-timeout-ac 0');
        exec('powercfg /change monitor-timeout-ac 0');
    }
    
    stop() {
        clearInterval(this.interval);
        // Restore original settings
        exec('powercfg /change standby-timeout-ac 30');
    }
}
```

---

## <a name="data-pipeline"></a>🛡️ Data Pipeline & Integrity

### Deduplication Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEDUPLICATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. On Startup:
   ├── Load existing CSV
   ├── Extract all job IDs (regex from URL column)
   ├── Store in Set<string> (Knowledge Base)
   └── Result: O(1) lookup for duplicates

2. Before Saving Job:
   ├── Check: knowledgeBase.has(jobId) ?
   │   ├── YES → Skip (duplicate)
   │   └── NO  → Save to CSV + add to Knowledge Base
   └── Update Knowledge Base in memory

3. CSV ID Extraction:
   Wuzzuf:   /p/([a-zA-Z0-9]+)/     → "ABC123XYZ"
   LinkedIn: /view/.*-(\d{7,})/    → "4358201528"
```

### CSV Format

**Wuzzuf CSV Headers (23 columns):**
```
Job Title, Company Name, Location, Job Type, Work Type, Experience Needed,
Career Level, Education Level, Salary, Job Categories, Skills, Posted Time,
Job URL, Company URL, Logo, Description, Requirements, Job Status,
Applicants, Open Positions, Viewed, In Consideration, Not Selected
```

**LinkedIn CSV Headers (14 columns):**
```
Job Id, Job Title, Company Name, Location, Job Type, Work Type,
Posted Time, Job URL, Description, Industry, Source, Job Status,
Experience Level, Easy Apply
```

### UTF-8 BOM for Arabic

```typescript
// Ensure Arabic characters display correctly in Excel
const BOM = '\uFEFF';
if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, BOM + headers.join(',') + '\n');
}
```

---

## <a name="repair-tool"></a>🛠️ Data Repair & Cleanup Tool

The project includes a unified repair tool to ensure data integrity (Schema v2):

### Capabilities
- **Fixes Shifted Columns**: Detects and repairs CSV rows where descriptions were unquoted.
- **Backfills Missing Data**: Scrapes `Applicants`, `Job Status`, and `Easy Apply` for older rows.
- **In-Place Updates**: Safely updates `data/linkedin_clean_data.csv`.

### Usage
```bash
./run_repair.sh
```

---

## <a name="setup"></a>🚦 Setup & Usage

### 1. Installation
```bash
git clone https://github.com/AhmeDvEssam/Egypt-Jobs-Scraper.git
cd Egypt-Jobs-Scraper
npm install
```

### 2. Build
```bash
npx tsc
```

### 3. Running Wuzzuf
```bash
npm start
# Or directly:
node dist/GlobalManager.js
```

### 4. Running LinkedIn
```bash
npm run scrape:linkedin
# Or directly:
node dist/LinkedInManager.js
```

### 5. Configuration

**Proxies (optional):**
Add proxies to `data/proxies.txt`:
```
http://user:pass@proxy1.com:8080
http://user:pass@proxy2.com:8080
```

**Constants in LinkedInManager.ts:**
```typescript
const SLEEP_BETWEEN_CYCLES_MS = 10 * 60 * 1000;  // 10 minutes
const SLEEP_BETWEEN_KEYWORDS_MS = 8000;           // 8 seconds
```

---

## <a name="project-structure"></a>📁 Project Structure

```
Egypt-Jobs-Scraper/
├── src/
│   ├── GlobalManager.ts           # Wuzzuf infinite loop controller
│   ├── LinkedInManager.ts         # LinkedIn enterprise controller (v3.0)
│   │
│   ├── core/
│   │   ├── BaseScraper.ts         # Abstract base with context pooling
│   │   ├── ScraperInterface.ts    # TypeScript interfaces (JobEntity, etc.)
│   │   └── utils.ts               # Random delays, user agents
│   │
│   ├── scrapers/
│   │   ├── JobCollector.ts        # CSV management & deduplication
│   │   ├── wuzzuf/
│   │   │   └── WuzzufScraper.ts   # Wuzzuf hybrid scraping logic
│   │   └── linkedin/
│   │       └── LinkedInBrowserScraper.ts  # LinkedIn stealth browser
│   │
│   ├── utils/
│   │   ├── Cleaner.ts             # CSV cleanup utilities
│   │   ├── NetworkHealthCheck.ts  # Internet connectivity monitor
│   │   ├── KeepAwake.ts           # System sleep prevention
│   │   └── normalize.ts           # URL normalization
│   │
│   └── tools/
│       ├── clean_linkedin_csv.ts  # Manual CSV cleanup
│       ├── repair_linkedin_csv.ts # CSV row repair
│       └── fix_csv_encoding.ts    # UTF-8 BOM fix
│
├── data/
│   ├── wuzzuf_clean_data_v3.csv   # Wuzzuf jobs database
│   ├── linkedin_clean_data.csv    # LinkedIn jobs database
│   ├── linkedin_state.json        # LinkedIn scraper state
│   └── proxies.txt                # Optional proxy list
│
├── dist/                          # Compiled JavaScript
├── package.json
└── tsconfig.json
```

---

## 📚 Additional Documentation

For detailed Arabic documentation:
👉 **[CODE_EXPLAINED_AR.md](./docs/CODE_EXPLAINED_AR.md)**

---

## 📄 License

This project is for educational purposes. Use responsibly and respect website terms of service.
