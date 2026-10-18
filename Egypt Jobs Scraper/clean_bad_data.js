const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
    try {
        console.log("Cleaning Database...");
        
        // Find jobs to delete
        const selQuery = `SELECT id FROM jobs WHERE source = 'Forasna' AND (location_raw = '' OR company_name = 'غير محدد')`;
        const toDelete = await pool.query(selQuery);
        console.log(`Found ${toDelete.rowCount} bad jobs to delete from database.`);
        
        if (toDelete.rowCount > 0) {
            const deleteIds = toDelete.rows.map(r => r.id);
            // First delete from job_descriptions
            const delDesc = await pool.query(`DELETE FROM job_descriptions WHERE job_id = ANY($1)`, [deleteIds]);
            console.log(`Deleted ${delDesc.rowCount} rows from job_descriptions.`);
            // Delete from jobs
            const delJobs = await pool.query(`DELETE FROM jobs WHERE id = ANY($1)`, [deleteIds]);
            console.log(`Deleted ${delJobs.rowCount} rows from jobs.`);
        }

        console.log("Cleaning CSV file...");
        const csvPath = 'data/forasna_clean_data_v2.csv';
        if (fs.existsSync(csvPath)) {
            const csvData = fs.readFileSync(csvPath, 'utf8');
            const lines = csvData.split('\n');
            const header = lines[0];
            let goodLines = [header];
            let deletedCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                // Extremely simple split (not handling quoted commas perfectly, but enough for this check)
                const parts = line.split(',');
                // Assuming columns: Source Job ID, URL, Title, Company Name, Location, ...
                // "Company Name" is index 3, "Location" is index 4.
                const company = parts[3] || '';
                const location = parts[4] || '';
                
                if (company.includes('غير محدد') || location.trim() === '') {
                    deletedCount++;
                } else {
                    goodLines.push(line);
                }
            }
            
            fs.writeFileSync(csvPath, goodLines.join('\n'), 'utf8');
            console.log(`Deleted ${deletedCount} bad jobs from CSV. Saved ${goodLines.length - 1} good jobs.`);
        } else {
            console.log("CSV file not found, skipping.");
        }
        
    } catch(e) {
        console.error(e.message);
    }
    await pool.end();
})();
