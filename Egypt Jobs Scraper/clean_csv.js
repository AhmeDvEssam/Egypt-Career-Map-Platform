const fs = require('fs');
const csvPath = 'data/forasna_clean_data_v1.csv';
if (fs.existsSync(csvPath)) {
    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n');
    const header = lines[0];
    let goodLines = [header];
    let deletedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Find company name = index 3 (0-based) 
        // Location = index 4
        // A simple check is enough since company 'غير محدد' only appears there usually
        if (line.includes('غير محدد')) {
            deletedCount++;
        } else {
            goodLines.push(line);
        }
    }
    
    fs.writeFileSync(csvPath, goodLines.join('\n'), 'utf8');
    console.log(`Deleted ${deletedCount} bad jobs from CSV. Saved ${goodLines.length - 1} good jobs.`);
} else {
    console.log('CSV file not found, skipping.');
}
