const fs = require('fs');
const { parse } = require('csv-parse/sync');

(async () => {
    try {
        const csvPath = 'data/forasna_clean_data_v1.csv';
        let fileContent = fs.readFileSync(csvPath, 'utf8');
        
        // Strip BOM if present
        if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1);
        }
        
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        let badCount = 0;
        
        for (const record of records) {
            const company = record['Company Name'] || '';
            const location = record['Location'] || '';
            
            if (company.includes('غير محدد') || location.trim() === '') {
                badCount++;
                if (badCount <= 5) {
                    console.log(`[CSV-PARSE] Bad Job: Title="${record['Job Title']}" Company="${company}" Location="${location}"`);
                }
            }
        }
        
        console.log(`Total valid records parsed: ${records.length}`);
        console.log(`Total bad rows found by csv-parse: ${badCount}`);
    } catch(e) {
        console.error("CSV Parsing Error:", e.message);
    }
})();
