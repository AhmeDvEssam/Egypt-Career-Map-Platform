const fs = require('fs');
const content = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
const lines = content.split('\n');
const headers = lines[0].split(',');
let found = 0;
for (let i = 1; i < lines.length; i++) {
    if (lines[i].includes('Front Desk Agent')) {
        found++;
        console.log('--- Row', found, '---');
        const fields = []; let cur = ''; let inQ = false;
        for (let c of lines[i]) { if (c==='"') inQ = !inQ; else if (c===',' && !inQ) { fields.push(cur); cur=''; } else cur+=c; }
        fields.push(cur);
        console.log('Skills:', fields[12]);
        console.log('Time:', fields[1]);
    }
}
