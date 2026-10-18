import { BaseScraper } from '../core/BaseScraper';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeUrl } from '../utils/normalize';

const DEFAULT_STATUS_COLUMN_INDEX = 17; // Fallback index for legacy CSVs
const DEFAULT_URL_COLUMN_INDEX = 12;

export class JobStatusChecker {
    private csvPath: string;
    private scraper: BaseScraper;

    private getColumnIndex(header: string[], candidates: string[], fallback: number): number {
        const lower = header.map(h => h.toLowerCase());
        for (const candidate of candidates) {
            const idx = lower.indexOf(candidate.toLowerCase());
            if (idx >= 0) return idx;
        }
        return fallback;
    }

    private getHeaderIndices(lines: string[]): { statusIndex: number; urlIndex: number } {
        if (lines.length === 0) return { statusIndex: DEFAULT_STATUS_COLUMN_INDEX, urlIndex: DEFAULT_URL_COLUMN_INDEX };
        const header = this.parseCSVLine(lines[0]);
        const statusIndex = this.getColumnIndex(header, ['Job Status', 'Status'], DEFAULT_STATUS_COLUMN_INDEX);
        const urlIndex = this.getColumnIndex(header, ['Job URL', 'URL', 'Link'], DEFAULT_URL_COLUMN_INDEX);
        return { statusIndex, urlIndex };
    }

    constructor(scraper: BaseScraper, csvPath: string) {
        this.csvPath = csvPath;
        this.scraper = scraper;
    }

    private parseCSVLine(line: string): string[] {
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

        // Clean quotes from ends
        return columns.map(c => {
            let val = c.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            return val.trim();
        });
    }

    private formatValue(val: string): string {
        return `"${(val || '').toString().replace(/"/g, '""')}"`;
    }

    public getStats(): { total: number, active: number, closed: number } {
        if (!fs.existsSync(this.csvPath)) return { total: 0, active: 0, closed: 0 };

        const content = fs.readFileSync(this.csvPath, 'utf-8');
        const lines = content.split('\n');

        let active = 0;
        let closed = 0;
        let total = 0;

        const { statusIndex, urlIndex } = this.getHeaderIndices(lines);

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            total++;

            // Quick Lowercase check
            const lowerLine = line.toLowerCase();

            // NOTE: This is a rough heuristic for speed. 
            // If "closed" appears in description, it might be false positive?
            // Safer to use parseCSVLine but catching 7000 rows might be 50-100ms. FINE.

            const cols = this.parseCSVLine(line);
            if (cols.length > statusIndex) {
                const status = (cols[statusIndex] || '').toLowerCase();
                if (status === 'closed' || status === 'expired') {
                    closed++;
                } else {
                    // Assume active if not closed (and has URL)
                    if (cols.length > urlIndex && cols[urlIndex]) {
                        active++;
                    }
                }
            }
        }
        return { total, active, closed };
    }

    public async checkBatch(batchSize: number = 20): Promise<number> {
        if (!fs.existsSync(this.csvPath)) return 0;

        const content = fs.readFileSync(this.csvPath, 'utf-8');
        const lines = content.split('\n');

        if (lines.length <= 1) return 0;

        const { statusIndex, urlIndex } = this.getHeaderIndices(lines);

        // 1. Identify Candidates (Open/Active Jobs)
        // We scan linearly. To be "Fair" and check OLD jobs, we should probably check 
        // a random set? Or simple sequential?
        // Let's check the *First* 20 "Open" jobs that haven't been checked recently?
        // We don't have a "Last Checked" column. 
        // Simple Strategy: Pick 20 RANDOM "Open" jobs to check. This ensures coverage over time.

        const openJobIndices: number[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Optimization: Quick check if line has relevant keywords
            // Wuzzuf uses "active" often
            const lowerLine = line.toLowerCase();
            if (!lowerLine.includes('active') && !lowerLine.includes('open')) {
                continue;
            }
            // Verify with parser
            // Parsing every line is slow? No, 7000 is fast in Node.
            const cols = this.parseCSVLine(line);
            if (cols.length > statusIndex) {
                const status = (cols[statusIndex] || '').toLowerCase();
                // Status is typically "active" or "Open"
                if (status === 'active' || status === 'open') {
                    openJobIndices.push(i);
                }
            }
        }

        if (openJobIndices.length === 0) {
            console.log('[StatusChecker] No Open jobs found to check.');
            return 0;
        }

        // Pick Random Batch
        const candidates: number[] = [];
        const pool = [...openJobIndices];

        for (let k = 0; k < batchSize && pool.length > 0; k++) {
            const r = Math.floor(Math.random() * pool.length);
            candidates.push(pool[r]);
            pool.splice(r, 1);
        }

        console.log(`[StatusChecker] Checking ${candidates.length} jobs for status updates...`);
        let updatedCount = 0;

        // Check them
        for (const lineIdx of candidates) {
            const line = lines[lineIdx];
            const cols = this.parseCSVLine(line);
            const rawUrl = cols[urlIndex];
            const cleanUrl = normalizeUrl(rawUrl);

            if (!cleanUrl) continue;
            // We use rawUrl for fetching, but cleanUrl for logging/tracking if needed
            // Actually fetch requires the full URL.

            const isClosed = await this.scraper.isJobClosed(rawUrl);

            if (isClosed) {
                console.log(`[StatusChecker] Job Closed: ${cols[0].substring(0, 30)}...`);
                // Update Status
                cols[statusIndex] = 'Closed';
                // Reconstruct Line safely
                const newLine = cols.map(c => this.formatValue(c)).join(',');
                lines[lineIdx] = newLine;
                updatedCount++;
            }

            // Polite Delay
            await new Promise(r => setTimeout(r, 1000));
        }

        if (updatedCount > 0) {
            await this.saveWithRetry(lines.join('\n'));
            console.log(`[StatusChecker] Updated ${updatedCount} jobs to 'Closed'.`);
        } else {
            console.log('[StatusChecker] No status changes found in this batch.');
        }

        return updatedCount;
    }

    private async saveWithRetry(content: string): Promise<void> {
        let saved = false;
        while (!saved) {
            try {
                fs.writeFileSync(this.csvPath, content);
                saved = true;
            } catch (err: any) {
                if (err.code === 'EBUSY') {
                    console.log('[StatusChecker] File Locked. Waiting...');
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    throw err;
                }
            }
        }
    }
}
