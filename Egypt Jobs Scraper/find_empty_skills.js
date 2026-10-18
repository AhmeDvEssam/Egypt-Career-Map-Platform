const fs = require('fs');

function parseCSVLine(line) {
    const columns = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { columns.push(current); current = ''; }
        else { current += char; }
    }
    columns.push(current);
    return columns;
}

const lines = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8').split('\n');
const failedUrls = [];

const header = lines[0].split(',');
let skillsIdx = 11;
let urlIdx = 12;
for(let i=0; i<header.length; i++) {
    if(header[i].toLowerCase().includes('skills')) skillsIdx = i;
    if(header[i].toLowerCase().includes('url')) urlIdx = i;
}

for(let i=1; i<lines.length; i++) {
    const line = lines[i].trim();
    if(!line) continue;
    const cols = parseCSVLine(line);
    if(cols.length > urlIdx) {
        let skills = cols[skillsIdx] ? cols[skillsIdx].trim() : '';
        let url = cols[urlIdx] ? cols[urlIdx].trim() : '';
        if(skills === '' && url.includes('bayt.com')) {
            failedUrls.push(url);
        }
    }
}
console.log('Total failed:', failedUrls.length);
console.log('Sample URLs:', failedUrls.slice(Math.max(0, failedUrls.length - 10)));
