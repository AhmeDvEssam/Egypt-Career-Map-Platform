const fs = require('fs');
const glob = require('glob');

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

const files = glob.sync('data/*_clean_*.csv');

files.forEach(file => {
    console.log('\n[=][=][=] Cleaning FIXED', file);
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    if (lines.length === 0) return;
    
    const header = lines[0];
    const cols = parseCSVLine(header.trim());
    let urlIdx = cols.findIndex(c => c.toLowerCase().includes('url') && !c.toLowerCase().includes('company'));
    if (urlIdx === -1) urlIdx = 12;

    const uniqueUrls = new Set();
    const validLines = [header];
    
    let dupeCount = 0;
    let corruptCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            const parsedCols = parseCSVLine(line);
            const rawUrl = parsedCols[urlIdx] || '';
            const urlLower = rawUrl.toLowerCase();
            
            if (!rawUrl || urlLower.includes('not specified') || urlLower.includes('confidential') || rawUrl.length < 10) {
                corruptCount++;
                continue;
            }
            
            let cleanUrl = rawUrl.split('?')[0].trim().toLowerCase();
            if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
            
            if (uniqueUrls.has(cleanUrl)) {
                dupeCount++;
                continue;
            }
            
            uniqueUrls.add(cleanUrl);
            validLines.push(line);
        } catch(e) {
            corruptCount++;
        }
    }
    
    fs.writeFileSync(file, validLines.join('\n') + '\n');
    console.log('- Dupes removed:', dupeCount);
    console.log('- Corrupt removed:', corruptCount);
    console.log('- Remaining valid rows:', validLines.length - 1);
});