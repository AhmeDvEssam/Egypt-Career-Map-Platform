
import * as fs from 'fs';
import * as path from 'path';

function parseCsvRobust(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = [];
    let inQuote = false;
    let currentRow = '';

    // Naive state machine to handle quoted newlines
    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (char === '"') {
            inQuote = !inQuote;
        }

        if (char === '\n' && !inQuote) {
            if (currentRow.trim()) rows.push(currentRow);
            currentRow = '';
        } else {
            currentRow += char;
        }
    }
    if (currentRow.trim()) rows.push(currentRow);

    return rows;
}

const csvPath = path.join(__dirname, '../data/indeed_jobs.csv');
console.log(`📂 Analyzing: ${csvPath}`);

try {
    const robustRows = parseCsvRobust(csvPath);
    const header = robustRows[0];
    const dataRows = robustRows.slice(1);

    console.log(`✅ Header: ${header}`);
    console.log(`📊 Actual Job Count: ${dataRows.length}`);

    // Preview first few to ensure they look like full rows
    // console.log('First Row Preview:', dataRows[0].substring(0, 100));
} catch (e) {
    console.error('Error:', e);
}
