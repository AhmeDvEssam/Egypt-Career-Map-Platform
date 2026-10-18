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
files.forEach(f => {
    const lines = fs.readFileSync(f, 'utf-8').split('\n');
    if (lines.length === 0) return;
    const cols = parseCSVLine(lines[0].trim());
    let urlIdx = cols.findIndex(c => c.toLowerCase().includes('url') && !c.toLowerCase().includes('company'));
    if (urlIdx === -1) urlIdx = 12;

    let corruptUrl = 0;
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCSVLine(lines[i].trim());
        const url = row[urlIdx] || '';
        if (url.toLowerCase().includes('not specified') || url.toLowerCase().includes('confidential')) corruptUrl++;
    }
    console.log(f, '- corrupt URLs:', corruptUrl);
});