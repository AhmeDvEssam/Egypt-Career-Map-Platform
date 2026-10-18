import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { DatabaseSync } from './src/utils/DatabaseSync';

async function syncAllMissingData() {
    console.log("🚀 Starting Bulk Upsert from CSV to Database...");

    const files = [
        { path: 'data/linkedin_clean_data.csv', source: 'LinkedIn' },
        { path: 'data/wuzzuf_clean_data_v3.csv', source: 'Wuzzuf' },
        { path: 'data/indeed_clean_data_v2.csv', source: 'Indeed' }
    ];

    for (const fileInfo of files) {
        const fullPath = path.resolve(__dirname, fileInfo.path);
        if (!fs.existsSync(fullPath)) {
            console.log(`[!] File not found: ${fullPath}`);
            continue;
        }

        console.log(`\n📂 Processing: ${fileInfo.path}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Parse CSV robustly
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true,
            relax_column_count: true
        });

        let success = 0;
        let errors = 0;

        console.log(`Found ${records.length} jobs in ${fileInfo.source}. Upserting live...`);

        // Handle BOM in first key
        const keys = Object.keys(records[0] || {});
        const jobIdKey = keys.find(k => k.includes('Job Id') || k.includes('Job ID')) || 'Job Id';
        const titleKey = keys.find(k => k.includes('Job Title') || k.includes('Title')) || 'Job Title';

        for (let i = 0; i < records.length; i++) {
            const row: any = records[i];
            
            let rawUrl = row['Job URL'] || row['URL'] || '';
            let extId = row[jobIdKey] || '';
            
            if (!extId && rawUrl) {
                if (rawUrl.includes('wuzzuf.net')) {
                    const match = rawUrl.match(/\/(?:p|internship)\/([a-zA-Z0-9-]+)\b/);
                    extId = match ? match[1] : '';
                } else if (rawUrl.includes('linkedin.com')) {
                    const match = rawUrl.match(/(\d{8,})/);
                    extId = match ? match[1] : '';
                }
            }

            // Map CSV row back to JobEntity based on source
            const job: any = {
                job_id: extId,
                title: row[titleKey] || '',
                company_name: row['Company Name'] || '',
                location: row['Location'] || '',
                url: row['Job URL'] || row['URL'] || '',
                job_type: row['Job Type'] || '',
                work_type: row['Work Type'] || '',
                career_level: row['Career Level'] || row['Experience Level'] || '',
                education_level: row['Education Level'] || '',
                job_categories: row['Industry'] || row['Job Categories'] || '',
                description: row['Description'] || '',
                requirements: row['Requirements'] || row['Job Requirements'] || ''
            };

            // Skip invalid jobs
            if (!job.job_id || !job.title) {
                continue;
            }

            try {
                await DatabaseSync.upsertJob(job, fileInfo.source);
                success++;
            } catch (e) {
                errors++;
            }

            if ((i + 1) % 500 === 0) {
                console.log(`   -> Processed ${i + 1}/${records.length} jobs...`);
            }
        }

        console.log(`✅ Finished ${fileInfo.source}. Successfully synced: ${success}. Errors: ${errors}.`);
    }

    await DatabaseSync.close();
    console.log("\n🎉 ALL MISSING DATA HAS BEEN SYNCED TO THE DATABASE!");
}

syncAllMissingData().catch(console.error);
