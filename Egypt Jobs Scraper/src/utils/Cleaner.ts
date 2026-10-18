import * as fs from 'fs';
import * as path from 'path';
import { normalizeUrl } from './normalize';

export interface CleanStats {
    totalRows: number;
    removed: number;
    unique: number;
}

export class Cleaner {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    public async loadKnownIds(): Promise<Set<string>> {
        const knownIds = new Set<string>();
        if (!fs.existsSync(this.filePath)) return knownIds;

        const content = fs.readFileSync(this.filePath, 'utf-8');
        const lines = content.split('\n');

        // URL is at index 12 based on header
        // "Title","Company","Location","Type","Level","Years","Country","Skills","Salary","Category","Date","Source","Job URL","Description","Requirements","Work Type"

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Fast regex extraction (safer than full parse for just ID)
            // Look for /p/ID or /internship/ID
            const match = line.match(/\/(?:p|internship)\/([a-zA-Z0-9]+)\b/);
            if (match) {
                knownIds.add(match[1]);
            }
        }
        return knownIds;
    }

    /**
     * Parses a CSV line strictly, handling quoted fields.
     */
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

    /**
     * Main function to clean duplicates.
     * Uses atomic-like write with retry for EBUSY errors.
     */
    public async clean(): Promise<CleanStats> {
        if (!fs.existsSync(this.filePath)) {
            return { totalRows: 0, removed: 0, unique: 0 };
        }

        const content = fs.readFileSync(this.filePath, 'utf-8');
        const lines = content.split('\n');

        const seen = new Map<string, boolean>();
        const outputLines: string[] = [];
        let duplicatesCount = 0;

        // Header
        if (lines.length > 0) {
            outputLines.push(lines[0].trim());
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCSVLine(line);

            // Job URL is index 12
            if (cols.length > 12) {
                const url = cols[12];
                let key = '';

                // Extract ID strategy
                if (url.includes('wuzzuf.net')) {
                    // Extract ID directly: /p/UUID-slug or /internship/UUID-slug
                    const match = url.match(/\/(?:p|internship)\/([a-zA-Z0-9]+)\b/);
                    key = match ? match[1] : url.trim();
                } else if (url.includes('linkedin.com')) {
                    // Extract ID: view/123456 or -123456
                    const match = url.match(/(\d{8,})/);
                    key = match ? match[1] : url.trim();
                } else {
                    key = normalizeUrl(url) || ''; // Fallback
                }

                if (key && key.length > 4) {
                    if (seen.has(key)) {
                        duplicatesCount++;
                        // console.log(`[Cleaner] Found duplicate: ${key}`);
                    } else {
                        seen.set(key, true);
                        outputLines.push(lines[i]); // Keep original formatting
                    }
                } else {
                    // Invalid URL? Keep line to be safe.
                    outputLines.push(lines[i]);
                }
            } else {
                // Keep malformed lines? Safest to drop if they don't have a URL column
                // But for now, let's just keep strict URL data.
            }
        }

        if (duplicatesCount > 0) {
            await this.saveWithRetry(outputLines.join('\n') + '\n');
        }

        return {
            totalRows: lines.length,
            removed: duplicatesCount,
            unique: outputLines.length
        };
    }

    private async saveWithRetry(content: string): Promise<void> {
        let saved = false;
        let attempts = 0;

        while (!saved && attempts < 20) { // Try for ~40 seconds
            try {
                fs.writeFileSync(this.filePath, content);
                saved = true;
            } catch (err: any) {
                if (err.code === 'EBUSY') {
                    attempts++;
                    console.log(`[Cleaner] File Locked. Waiting to retry... (${attempts}/20)`);
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    throw err;
                }
            }
        }

        if (!saved) {
            console.error('[Cleaner] Failed to save after multiple attempts. Is the file permanently locked?');
        }
    }
}
