const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        console.log("Analyzing CSV with csv-parse...");
        const csvPath = 'data/forasna_clean_data_v1.csv';
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        let badCount = 0;
        const goodRecords = [];
        const badUrls = [];
        
        for (const record of records) {
            const company = record['Company Name'] || '';
            const location = record['Location'] || '';
            
            if (company.includes('غير محدد') || location.trim() === '') {
                badCount++;
                badUrls.push(record['URL']);
                if (badCount <= 5) console.log(`[CSV] Bad Job: Title="${record['Job Title']}" Company="${company}" Location="${location}"`);
            } else {
                goodRecords.push(record);
            }
        }
        
        console.log(`Total rows in CSV: ${records.length}`);
        console.log(`Total bad rows found: ${badCount}`);
        
        if (badCount > 0) {
            // Write good records back to CSV
            const newCsvContent = stringify(goodRecords, { header: true });
            fs.writeFileSync(csvPath, newCsvContent, 'utf8');
            console.log(`Cleaned CSV saved. Remaining records: ${goodRecords.length}`);
            
            // Delete from DB
            console.log("Deleting bad rows from database by URL...");
            let dbDelCount = 0;
            for (const url of badUrls) {
                if (!url) continue;
                const delDesc = await pool.query('DELETE FROM job_descriptions WHERE job_id IN (SELECT id FROM jobs WHERE job_url = $1)', [url]);
                const delJobs = await pool.query('DELETE FROM jobs WHERE job_url = $1', [url]);
                dbDelCount += delJobs.rowCount;
            }
            console.log(`Deleted ${dbDelCount} bad rows from jobs table.`);
        } else {
            console.log("CSV is perfectly clean!");
        }
        
    } catch(e) {
        console.error(e);
    }
    await pool.end();
})();
