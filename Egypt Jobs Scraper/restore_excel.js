const { Client } = require('pg');
const fs = require('fs');
const client = new Client({ user: 'egypt_jobs', host: 'localhost', database: 'egypt_jobs_db', password: 'egypt_jobs_2026', port: 5432 });

function escapeCSV(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(';') || str.includes('\"') || str.includes('\n')) {
        return '\"' + str.replace(/\"/g, '\"\"') + '\"';
    }
    return str;
}

client.connect().then(async () => {
    await client.query("UPDATE jobs SET job_type = 'Not Specified' WHERE source = 'Indeed' AND (job_type ILIKE '%EGP%' OR job_type ILIKE '%month%' OR job_type ILIKE '%year%')");
    const res = await client.query("SELECT * FROM jobs WHERE source = 'Indeed' ORDER BY created_at DESC");
    const headers = ['Job Id', 'Scraping Date', 'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type', 'Experience Level', 'Education Level', 'Job Category', 'Salary', 'Source', 'Job URL', 'Description', 'Requirements', 'Keywords'];
    let csvContent = '\uFEFF' + headers.join(';') + '\n';
    for (const row of res.rows) {
        const csvRow = [
            escapeCSV(row.source_job_id),
            escapeCSV(row.scraped_at || row.created_at),
            escapeCSV(row.title_raw),
            escapeCSV(row.company_name),
            escapeCSV(row.location_raw),
            escapeCSV(row.job_type),
            escapeCSV(row.work_type),
            escapeCSV(row.career_level || 'Not Specified'),
            escapeCSV(row.education_level || 'Not Specified'),
            escapeCSV(row.job_category || 'Not Specified'),
            escapeCSV(row.salary_min ? (row.salary_min + ' - ' + row.salary_max + ' ' + row.currency) : 'Not Specified'),
            escapeCSV(row.source_raw || 'Indeed'),
            escapeCSV(row.job_url),
            escapeCSV(''), 
            escapeCSV(''), 
            escapeCSV('')  
        ];
        csvContent += csvRow.join(';') + '\n';
    }
    fs.writeFileSync('data/indeed_clean_data_excel_fix.csv', csvContent);
    client.end();
}).catch(e => console.log('DB Error:', e.message));