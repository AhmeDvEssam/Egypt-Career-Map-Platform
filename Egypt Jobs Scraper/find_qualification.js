const fs = require('fs');
const content = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
const lines = content.split('\n');

for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const fields = []; let cur = ''; let inQ = false;
    for (let c of row) { if (c==='"') inQ = !inQ; else if (c===',' && !inQ) { fields.push(cur); cur=''; } else cur+=c; }
    fields.push(cur);
    
    const desc = fields[17] || ''; // Description is index 17
    const skills = fields[12] || '';
    
    if (desc.toLowerCase().includes('qualification') && skills === '') {
        console.log('--- MISSING SKILLS WITH QUALIFICATION ---');
        console.log('Title:', fields[2]);
        console.log('Desc preview:', desc.substring(0, 200).replace(/\s+/g, ' '));
        console.log('Url:', fields[14]);
    }
}
