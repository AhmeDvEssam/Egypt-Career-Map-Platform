
import pool from './database/db';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { URL } from 'url';

// Helper to extract ID from URL
function extractSourceId(source: string, url: string, rowId?: string): string {
    if (rowId && source === 'LinkedIn') return rowId;

    try {
        if (!url) return `unknown-${Date.now()}-${Math.random()}`;

        if (source === 'Indeed') {
            const u = new URL(url);
            const jk = u.searchParams.get('jk');
            if (jk) return jk;
            // Fallback for clean URLs
            const match = url.match(/jk=([a-f0-9]+)/);
            return match ? match[1] : `indeed-${Buffer.from(url).toString('base64').substring(0, 20)}`;
        }

        if (source === 'Wuzzuf') {
            // Standard Wuzzuf URL: https://wuzzuf.net/jobs/p/UUID-Slug
            const parts = url.split('/');
            const lastPart = parts[parts.length - 1]; // UUID-Slug
            // Try to extract UUID (usually 8-4-4-4-12 hex or similar, or just a unique number)
            // Wuzzuf IDs are surprisingly varied. Taking the last segment is usually safe enough as refined ID.
            return lastPart.split('-')[0]; // First part of slug is usually the ID
        }
    } catch (e) {
        return `error-${Date.now()}`;
    }

    return `generated-${Date.now()}-${Math.random()}`;
}

function parseSalary(salaryStr: string) {
    let min = null;
    let max = null;
    let currency = null;

    if (!salaryStr) return { min, max, currency };

    // Simple parser for "3000 - 5000 EGP"
    const lower = salaryStr.toLowerCase();

    // Detect currency
    if (lower.includes('egp') || lower.includes('le') || lower.includes('pounds')) currency = 'EGP';
    else if (lower.includes('usd') || lower.includes('$')) currency = 'USD';
    else if (lower.includes('eur')) currency = 'EUR';

    // Extract numbers
    const numbers = salaryStr.match(/\d+/g);
    if (numbers) {
        if (numbers.length >= 2) {
            min = parseInt(numbers[0]);
            max = parseInt(numbers[1]);
        } else if (numbers.length === 1) {
            min = parseInt(numbers[0]);
        }
    }

    return { min, max, currency };
}

async function ingestFile(filePath: string, sourceOverride?: string) {
    console.log(`\n📂 Processing: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet); // Array of objects

    console.log(`📊 Found ${data.length} rows.`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const client = await pool.connect();

    try {
        for (const row of data as any[]) {
            // Determine Source
            let source = sourceOverride || row['Source'] || row['source'];
            if (!source) {
                if (filePath.toLowerCase().includes('indeed')) source = 'Indeed';
                else if (filePath.toLowerCase().includes('linkedin')) source = 'LinkedIn';
                else if (filePath.toLowerCase().includes('wuzzuf')) source = 'Wuzzuf';
                else if (filePath.toLowerCase().includes('bayt')) source = 'Bayt';
                else if (filePath.toLowerCase().includes('forasna')) source = 'Forasna';
                else source = 'Unknown';
            }

            // Normalization keys based on detected source
            let title = row['Job Title'] || row['title'] || row['Title'];
            let company = row['Company Name'] || row['company_name'] || row['Company'];
            let location = row['Location'] || row['location'];
            let url = row['Job URL'] || row['url'] || row['link'];
            let desc = row['Description'] || row['description'] || row['content'];
            let postedRaw = row['Posted Date Raw'] || row['Posted Time'] || row['posted_time'] || row['posted_date'];

            // Source Specific IDs
            let sourceId = extractSourceId(source, url, row['Job Id']);

            // Mappings
            let jobType = row['Job Type'] || row['job_type'];
            let workType = row['Work Type'] || row['work_type'];
            let careerLevel = row['Career Level'] || row['career_level'];
            let expLevel = row['Experience Level'] || row['Experience Needed'] || row['experience_level'];
            let eduLevel = row['Education Level'] || row['education_level'];
            let jobCategory = row['Job Category'] || row['job_category'] || row['category'];

            // Salary
            const salaryRaw = row['Salary'] || row['salary'];
            const { min, max, currency } = parseSalary(salaryRaw);

            // Date Cleaning
            let postedDate = null;
            if (postedRaw) {
                try {
                    // Try parsing
                    const d = new Date(postedRaw);
                    if (!isNaN(d.getTime())) postedDate = d.toISOString();
                } catch (e) { }
            }

            if (!title || !url) {
                skipped++;
                continue;
            }

            // UPSERT Query
            const queryText = `
                INSERT INTO jobs (
                    source, source_job_id, title, company_name, location,
                    job_url, company_url, posted_date, 
                    job_type, work_type, experience_level, career_level, education_level,
                    salary_min, salary_max, currency,
                    job_category,
                    source_raw
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8,
                    $9, $10, $11, $12, $13,
                    $14, $15, $16,
                    $17,
                    $18
                )
                ON CONFLICT (source, source_job_id) 
                DO UPDATE SET
                    title = EXCLUDED.title,
                    company_name = EXCLUDED.company_name,
                    location = EXCLUDED.location,
                    job_url = EXCLUDED.job_url,
                    posted_date = COALESCE(EXCLUDED.posted_date, jobs.posted_date),
                    job_category = EXCLUDED.job_category,
                    scraped_at = NOW(),
                    source_raw = EXCLUDED.source_raw
                RETURNING id;
            `;

            const values = [
                source, sourceId, title, company, location,
                url, row['Company URL'], postedDate,
                jobType, workType, expLevel, careerLevel, eduLevel,
                min, max, currency,
                jobCategory,
                JSON.stringify(row) // Store raw row for backup
            ];

            try {
                const res = await client.query(queryText, values);
                const jobId = res.rows[0].id;

                // Insert Description if available
                if (desc) {
                    await client.query(`
                        INSERT INTO job_descriptions (job_id, type, content, is_primary)
                        VALUES ($1, 'description', $2, TRUE)
                        ON CONFLICT DO NOTHING -- Naive handling for now, assume 1 desc per job
                    `, [jobId, desc]);

                    // TODO: Handle requirements/responsibilities splitting later
                }

                inserted++;
            } catch (err) {
                console.error(`Failed to insert ${source} - ${title}:`, err);
                skipped++;
            }

            if (inserted % 50 === 0) process.stdout.write(`\r✅ Processed: ${inserted + updated} / ${data.length}`);
        }

        console.log(`\n✨ Finished ${filePath}:`);
        console.log(`   - Inserted/Updated: ${inserted}`);
        console.log(`   - Skipped: ${skipped}`);

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        client.release();
    }
}

async function main() {
    console.log('🚀 Starting Data Ingestion Pipeline...');

    // File Paths
    const files = [
        { path: 'data/linkedin_clean_data.csv', source: 'LinkedIn' },
        { path: 'data/indeed_clean_data_v2.csv', source: 'Indeed' },
        { path: 'data/wuzzuf_clean_data_v3.csv', source: 'Wuzzuf' },
        { path: 'data/bayt_clean_data_v3.csv', source: 'Bayt' },
        { path: 'data/forasna_clean_data_v1.csv', source: 'Forasna' }
    ];

    for (const f of files) {
        await ingestFile(path.resolve(__dirname, '..', f.path), f.source);
    }

    await pool.end();
    console.log('👋 Ingestion Complete.');
}

main();
