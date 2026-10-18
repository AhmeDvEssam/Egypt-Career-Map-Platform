const fs = require('fs');
const content = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);
const headers = lines[0].split(',');
const titleIdx = headers.indexOf('Job Title');
const skillsIdx = headers.indexOf('Skills');
const urlIdx = headers.indexOf('Job URL');

function parseCSVLine(text) {
    const ret = []; let cur = ''; let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') inQuote = !inQuote;
        else if (text[i] === ',' && !inQuote) { ret.push(cur.trim()); cur = ''; }
        else cur += text[i];
    }
    ret.push(cur.trim());
    return ret;
}

let emptySkillsUrls = [];
for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (!row[skillsIdx] || row[skillsIdx] === 'Not Specified' || row[skillsIdx].trim() === '') {
        emptySkillsUrls.push({ title: row[titleIdx], url: row[urlIdx] });
    }
}
console.log('Empty Skills Count:', emptySkillsUrls.length);
console.log('Sample URLs:');
console.log(emptySkillsUrls.slice(0, 5));
