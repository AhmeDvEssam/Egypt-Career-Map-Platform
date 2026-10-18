const fs = require('fs');
if(fs.existsSync('data/bayt_clean_data_v3.csv')) {
    const csv = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
    const lines = csv.split('\n');
    let emptySkills = [];
    
    for(let i=1; i<lines.length; i++) {
        const row = lines[i];
        if(!row.trim()) continue;
        const fields = []; let cur = ''; let inQ = false;
        for (let c of row) { if (c==='"') inQ = !inQ; else if (c===',' && !inQ) { fields.push(cur); cur=''; } else cur+=c; }
        fields.push(cur);
        
        const skills = fields[12] || '';
        const url = fields[14] || '';
        const title = fields[2] || '';
        
        if(skills.trim() === '') {
            emptySkills.push({title, url});
        }
    }
    
    console.log('Total jobs scraped:', lines.length - 2); // header and empty last line
    console.log('Jobs with empty skills:', emptySkills.length);
    if (emptySkills.length > 0) {
        console.log('Sample failed URLs:');
        emptySkills.slice(0, 5).forEach(e => console.log(e.title, '-', e.url));
    }
} else {
    console.log('No CSV found.');
}
