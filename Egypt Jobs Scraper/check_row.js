const fs = require('fs');
const content = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
const lines = content.split('\n');
const headers = lines[0].split(',');
const row = lines.find(l => l.includes('Front Desk Agent'));
const fields = [];
let cur = ''; let inQ = false;
for (let c of row) { if (c==='"') inQ = !inQ; else if (c===',' && !inQ) { fields.push(cur); cur=''; } else cur+=c; }
fields.push(cur);
for (let i=0; i<headers.length; i++) console.log(headers[i], ':', fields[i]);
