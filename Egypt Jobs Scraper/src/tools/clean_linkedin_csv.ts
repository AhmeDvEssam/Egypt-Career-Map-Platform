import * as fs from 'fs';
import * as path from 'path';

// Clean LinkedIn CSV - remove Logo and Applicants columns
const csvPath = path.join(process.cwd(), 'data', 'linkedin_clean_data.csv');
const outputPath = path.join(process.cwd(), 'data', 'linkedin_clean_data_cleaned.csv');

if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found at:', csvPath);
    process.exit(1);
}

const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

console.log(`📂 Processing: ${csvPath}`);
console.log(`   Original lines: ${lines.length}`);

// Original headers: Job Id,Job Title,Company Name,Location,Job Type,Work Type,Posted Time,Job URL,Logo,Description,Industry,Applicants,Source,Job Status,Experience Level,Easy Apply
// New headers: Job Id,Job Title,Company Name,Location,Job Type,Work Type,Posted Time,Job URL,Description,Industry,Source,Job Status,Experience Level,Easy Apply

// Column indices to REMOVE: Logo (8), Applicants (11)
const removeIndices = [8, 11]; // 0-indexed

function processLine(line: string): string {
    if (!line.trim()) return '';

    // Smart CSV parsing that handles quoted fields with commas
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            current += char;
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current); // Last field

    // Remove the specified columns
    const newFields = fields.filter((_, idx) => !removeIndices.includes(idx));

    return newFields.join(',');
}

const newLines = lines.map(line => processLine(line)).filter(l => l);
fs.writeFileSync(outputPath, newLines.join('\n'), 'utf-8');

console.log(`✅ Cleaned CSV saved to: ${outputPath}`);
console.log(`   Cleaned lines: ${newLines.length}`);

// Replace original with cleaned
fs.copyFileSync(outputPath, csvPath);
fs.unlinkSync(outputPath);
console.log(`✅ Original CSV updated - removed Logo and Applicants columns.`);
