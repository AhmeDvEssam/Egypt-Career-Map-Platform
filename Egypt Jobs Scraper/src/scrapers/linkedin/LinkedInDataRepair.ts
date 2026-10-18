
import fs from 'fs';
import path from 'path';
import { chromium, Browser, Page } from 'playwright';

// Configuration
const CONCURRENCY = 10;
const INPUT_CSV = path.join(__dirname, 'data', 'linkedin_clean_data_fixed.csv'); // Read from the FIXED file (to cleanup)
const OUTPUT_CSV_FINAL = path.join(__dirname, 'data', 'linkedin_clean_data_final.csv'); // Write to final

interface JobRow {
    [key: string]: string;
}

// Minimal CSV Parser - ROBUST
function parseCSV(content: string): JobRow[] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuote = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuote && nextChar === '"') {
                currentField += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            currentRow.push(currentField);
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentRow.length > 0 || currentField.length > 0) {
                currentRow.push(currentField);
                // Clean fields
                const cleanedRow = currentRow.map(s => s.trim());
                rows.push(cleanedRow);
            }
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    if (currentRow.length > 0 || currentField.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow.map(s => s.trim()));
    }

    if (rows.length === 0) return [];

    // Header logic
    const headers = rows[0];
    const jobRows: JobRow[] = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        while (values.length < headers.length) values.push(''); // Pad

        const row: JobRow = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        jobRows.push(row);
    }
    return jobRows;
}

function stringifyCSV(rows: JobRow[], headers: string[]): string {
    const escape = (val: string) => {
        if (val === undefined || val === null) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const headerLine = headers.map(escape).join(',');
    const body = rows.map(row => headers.map(h => escape(row[h])).join(',')).join('\n');
    return `${headerLine}\n${body}\n`;
}

function parseRelativeTime(relative: string): string {
    const now = new Date();
    const lower = relative.toLowerCase();
    const match = lower.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : 1;

    if (lower.includes('min')) now.setMinutes(now.getMinutes() - num);
    else if (lower.includes('hour')) now.setHours(now.getHours() - num);
    else if (lower.includes('day')) now.setDate(now.getDate() - num);
    else if (lower.includes('week')) now.setDate(now.getDate() - num * 7);
    else if (lower.includes('month')) now.setDate(now.getDate() - num * 30);
    else if (lower.includes('year')) now.setDate(now.getDate() - num * 365);

    return now.toISOString();
}

async function processJob(page: Page, row: JobRow): Promise<JobRow> {
    const url = row['Job URL'];
    const newRow = { ...row };

    try {
        // Navigate with massive timeout for cleanup
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        } catch (e) {
            // Retry once?
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
        }

        // Dismiss modals...
        try { await page.click('[aria-label="Dismiss"]', { timeout: 2000 }); } catch (e) { }
        try { await page.click('.modal__dismiss', { timeout: 2000 }); } catch (e) { }


        // --- 1. Job Status ---
        const bodyText = (await page.innerText('body')).toLowerCase();
        const isClosed = bodyText.includes('no longer accepting') ||
            bodyText.includes('job has been closed') ||
            bodyText.includes('position has been filled');

        if (isClosed) {
            newRow['Job Status'] = 'Closed';
        } else {
            newRow['Job Status'] = 'Open';
        }

        // --- 2. Easy Apply ---
        // Enhanced Check
        const easyApply = await page.evaluate(() => {
            const bodyLower = document.body.innerText.toLowerCase();
            if (bodyLower.includes('easy apply')) return true; // Robust text check
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(b => (b as any).innerText?.toLowerCase().includes('easy apply'));
        });

        if (easyApply) {
            newRow['Easy Apply'] = 'Yes';
        } else {
            newRow['Easy Apply'] = 'No';
        }

        // --- 3. Posted Time ---
        const postedTimeText = await page.evaluate(() => {
            const selectors = [
                '.posted-time-ago__text',
                '.job-details-jobs-unified-top-card__primary-description-container span:nth-child(3)',
                'time',
                '.job-view-layout span:has-text("ago")'
            ];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.textContent && el.textContent.match(/\d/)) return el.textContent.trim();
            }
            return null;
        });

        if (postedTimeText) {
            newRow['Posted Time'] = parseRelativeTime(postedTimeText);
        }

        // --- 4. Applicants ---
        // Verify via text content using Locator (Waits for 3s max)
        let applicantsText: string | null = null;
        try {
            const loc = page.locator('.num-applicants__caption, .job-details-jobs-unified-top-card__applicant-count, .tvm__text--low-emphasis, .job-view-layout span:has-text("applicant")').first();
            await loc.waitFor({ state: 'attached', timeout: 3000 }); // Wait up to 3s
            applicantsText = await loc.innerText();
        } catch (e) {
            // Not found in 3s
        }

        // Fallback: Body Text Regex (High Confidence)
        if (!applicantsText) {
            const body = await page.innerText('body');
            const match = body.match(/(\d+)\s*applicants?/i);
            if (match) applicantsText = match[0];
            else if (body.includes('Be among the first 25 applicants')) applicantsText = '25';
        }

        if (applicantsText) {
            const match = applicantsText.match(/(\d+)/);
            newRow['Applicants'] = match ? match[1] : '0';
        } else {
            if (!newRow['Applicants']) newRow['Applicants'] = '0';
        }

        // Fallback: Body Text Regex (High Confidence)
        if (!applicantsText) {
            const body = await page.innerText('body');
            const match = body.match(/(\d+)\s*applicants?/i);
            if (match) applicantsText = match[0];
            else if (body.includes('Be among the first 25 applicants')) applicantsText = '25';
        }

        if (applicantsText) {
            const match = applicantsText.match(/(\d+)/);
            newRow['Applicants'] = match ? match[1] : '0';
        } else {
            if (!newRow['Applicants']) newRow['Applicants'] = '0';
        }

    } catch (err) {
        // Keep original
    }

    return newRow;
}

// Main
(async () => {
    console.log("🚀 Starting CLEANUP Browser Scraper...");

    if (!fs.existsSync(INPUT_CSV)) {
        console.error("Input CSV not found: " + INPUT_CSV);
        process.exit(1);
    }

    const content = fs.readFileSync(INPUT_CSV, 'utf-8');
    const rows = parseCSV(content);
    console.log(`Loaded ${rows.length} total rows.`);

    // Force Headers
    const headers = [
        'Job Id', 'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type',
        'Posted Time', 'Job URL', 'Description', 'Industry', 'Source',
        'Job Status', 'Experience Level', 'Easy Apply', 'Applicants'
    ];

    // Fill any missing keys
    rows.forEach(r => {
        headers.forEach(h => {
            if (!r[h]) r[h] = '';
        });
    });

    // FILTER: Find rows to cleanup
    // 1. Easy Apply is empty, 'Unknown'
    // 2. Applicants is empty
    const tasksIndices = rows.map((r, i) => {
        const ea = r['Easy Apply'] || '';
        const app = r['Applicants'] || '';
        // Fix: Treat '0' as invalid/missing to force re-check, OR if legit 0, it will just be '0' again.
        // Better than leaving it as default '0' when it should be 25.
        const bad = !ea || ea === 'Unknown' || !app || app === '0';
        return bad ? i : -1;
    }).filter(i => i !== -1);

    console.log(`🔍 Found ${tasksIndices.length} rows to cleanup.`);

    if (tasksIndices.length === 0) {
        console.log("Nothing to clean! Exiting.");
        process.exit(0);
    }

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certifcate-errors',
            '--ignore-certifcate-errors-spki-list',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    });

    let processedCount = 0;

    // We process only the tasksIndices but update 'rows' in place
    // To safe incremental, we should write the FULL 'rows' array every time?
    // Data is large (12k). Writing 12k rows every batch is okay-ish (12k lines is fast).

    for (let i = 0; i < tasksIndices.length; i += CONCURRENCY) {
        const batchIndices = tasksIndices.slice(i, i + CONCURRENCY);
        const tasks = batchIndices.map(async (idx) => {
            const row = rows[idx];
            const context = await browser.newContext();
            const page = await context.newPage();
            const result = await processJob(page, row);
            try { await page.close(); } catch (e) { }
            try { await context.close(); } catch (e) { }

            // Update in place
            rows[idx] = result;
            return result;
        });

        await Promise.all(tasks);
        processedCount += batchIndices.length;

        const progress = (processedCount / tasksIndices.length * 100).toFixed(1);
        process.stdout.write(`\rCleanup: ${processedCount}/${tasksIndices.length} (${progress}%)`);

        // Save
        if (processedCount % 20 === 0) {
            const csvContent = stringifyCSV(rows, headers);
            fs.writeFileSync(INPUT_CSV, csvContent); // Overwrite same file to be "Live"
        }
    }

    console.log("\nSaving final CSV...");
    const csvContent = stringifyCSV(rows, headers);
    fs.writeFileSync(INPUT_CSV, csvContent);
    // Also save a final copy
    fs.writeFileSync(OUTPUT_CSV_FINAL, csvContent);

    await browser.close();
    console.log("Done! ✅");
})();
