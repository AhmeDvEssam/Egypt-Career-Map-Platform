import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../../database/db';
import { categorizeJob } from '../../utils/CategoryMapper';

export interface PaylabSalaryRecord {
    roleTitle: string;
    titleNormalized: string;
    category: string;
    minSalary: number;
    medianSalary: number;
    maxSalary: number;
    currency: string;
    sourceUrl: string;
}

export class PaylabSalaryScraper {
    private baseUrl = 'https://www.paylab.com';
    private headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    };

    /**
     * Run the complete Paylab Egypt salary ingestion
     */
    public async run(): Promise<{ totalCategories: number, totalRolesUpserted: number }> {
        console.log('================================================');
        console.log('   [PAYLAB EGYPT SALARY INTELLIGENCE SCRAPER]   ');
        console.log('================================================');

        const categories = await this.fetchCategories();
        console.log(`[Paylab] Discovered ${categories.length} industry categories in Egypt.`);

        let totalUpserted = 0;

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            console.log(`\n[Paylab] (${i + 1}/${categories.length}) Processing: ${cat.name}...`);
            
            try {
                const records = await this.scrapeCategoryRoles(cat.url, cat.name);
                console.log(`[Paylab] Found ${records.length} salary benchmarks in "${cat.name}".`);

                for (const record of records) {
                    await this.upsertBenchmark(record);
                    totalUpserted++;
                }
            } catch (err: any) {
                console.error(`[Paylab] ⚠️ Error processing category "${cat.name}":`, err.message);
            }

            // Polite jitter between categories (300ms - 800ms)
            const jitter = Math.floor(Math.random() * 500) + 300;
            await new Promise(r => setTimeout(r, jitter));
        }

        console.log('\n================================================');
        console.log(`✅ [Paylab Scraper Complete] Ingested ${totalUpserted} benchmarks across ${categories.length} categories.`);
        console.log('================================================');

        return { totalCategories: categories.length, totalRolesUpserted: totalUpserted };
    }

    /**
     * Fetch all category URLs from Egypt index
     */
    private async fetchCategories(): Promise<{ name: string, url: string }[]> {
        const indexUrl = `${this.baseUrl}/eg/salaryinfo?lang=en`;
        const res = await axios.get(indexUrl, { headers: this.headers, timeout: 20000 });
        const $ = cheerio.load(res.data);
        const categories: { name: string, url: string }[] = [];

        $('a[href*="/salaryinfo/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

            // Clean category text
            const textParts = $(el).text().split('\n').map(s => s.trim()).filter(Boolean);
            const name = textParts[0] || href.split('/salaryinfo/')[1]?.split('?')[0] || '';

            // Avoid duplicate links or root
            if (name && !categories.some(c => c.url === fullUrl) && !fullUrl.endsWith('/salaryinfo?lang=en')) {
                categories.push({ name, url: fullUrl });
            }
        });

        return categories;
    }

    /**
     * Scrape all role compensation benchmarks inside one category
     */
    private async scrapeCategoryRoles(categoryUrl: string, categoryName: string): Promise<PaylabSalaryRecord[]> {
        const res = await axios.get(categoryUrl, { headers: this.headers, timeout: 20000 });
        const $ = cheerio.load(res.data);
        const records: PaylabSalaryRecord[] = [];

        // Match role links inside the category page
        // Format of href: /eg/salaryinfo/{catSlug}/{roleSlug}?lang=en
        $('a[href*="/salaryinfo/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;

            // Must be a sub-role link (contains at least two slashes after salaryinfo)
            const match = href.match(/\/salaryinfo\/([^/?]+)\/([^/?]+)/);
            if (!match) return;

            const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
            const roleSlug = match[2];

            // Reconstruct clean title from slug or text
            const rawText = $(el).text().replace(/\s+/g, ' ').trim();
            
            // Extract salary numbers: e.g. "12,548 - 42,989 EGP"
            const salaryMatch = rawText.match(/([\d,]+)\s*-\s*([\d,]+)\s*EGP/i);
            if (!salaryMatch) return;

            const minSalary = parseInt(salaryMatch[1].replace(/,/g, ''), 10);
            const maxSalary = parseInt(salaryMatch[2].replace(/,/g, ''), 10);
            if (isNaN(minSalary) || isNaN(maxSalary) || minSalary <= 0) return;

            const medianSalary = Math.round((minSalary + maxSalary) / 2);

            // Clean role title: title is before the long description or from slug
            // e.g. "csharp-programmer" -> "C# Programmer"
            let roleTitle = roleSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            // Attempt to take first 3-4 words of rawText before description
            const firstWords = rawText.split(' ').slice(0, 4).join(' ');
            if (firstWords.length > 3 && !firstWords.includes('-') && !/\d/.test(firstWords)) {
                roleTitle = firstWords;
            }

            const titleNormalized = roleTitle.toLowerCase().trim();
            const mappedCategory = categorizeJob(roleTitle) || categoryName;

            // Prevent duplicates in same category
            if (!records.some(r => r.titleNormalized === titleNormalized)) {
                records.push({
                    roleTitle,
                    titleNormalized,
                    category: mappedCategory,
                    minSalary,
                    medianSalary,
                    maxSalary,
                    currency: 'EGP',
                    sourceUrl: fullUrl
                });
            }
        });

        return records;
    }

    /**
     * Upsert record into salary_benchmarks table
     */
    private async upsertBenchmark(record: PaylabSalaryRecord): Promise<void> {
        const query = `
            INSERT INTO salary_benchmarks (
                role_title,
                title_normalized,
                category,
                company_name,
                country,
                min_salary,
                median_salary,
                max_salary,
                p10_salary,
                p90_salary,
                currency,
                source,
                source_url,
                updated_at
            ) VALUES ($1, $2, $3, NULL, 'Egypt', $4, $5, $6, $4, $6, 'EGP', 'Paylab', $7, NOW())
            ON CONFLICT (title_normalized, category, company_name, source)
            DO UPDATE SET
                min_salary = EXCLUDED.min_salary,
                median_salary = EXCLUDED.median_salary,
                max_salary = EXCLUDED.max_salary,
                p10_salary = EXCLUDED.p10_salary,
                p90_salary = EXCLUDED.p90_salary,
                source_url = EXCLUDED.source_url,
                updated_at = NOW()
        `;

        await pool.query(query, [
            record.roleTitle,
            record.titleNormalized,
            record.category,
            record.minSalary,
            record.medianSalary,
            record.maxSalary,
            record.sourceUrl
        ]);
    }
}

// Direct CLI execution support
if (require.main === module) {
    const scraper = new PaylabSalaryScraper();
    scraper.run().then(() => {
        pool.end();
    }).catch(err => {
        console.error('Fatal error:', err);
        pool.end();
        process.exit(1);
    });
}
