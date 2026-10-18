import * as fs from 'fs';
import * as path from 'path';

/**
 * LinkedIn CSV Repair Tool
 * Fixes corrupted rows where newlines in description broke CSV structure
 */

const csvPath = path.join(process.cwd(), 'data', 'linkedin_clean_data.csv');
const backupPath = path.join(process.cwd(), 'data', 'linkedin_clean_data.backup.csv');

if (!fs.existsSync(csvPath)) {
    console.log('CSV file not found');
    process.exit(1);
}

console.log('🔧 LinkedIn CSV Repair Tool');
console.log('===========================\n');

// Read raw content
const content = fs.readFileSync(csvPath, 'utf-8');

// Backup
fs.copyFileSync(csvPath, backupPath);
console.log(`✅ Backup created: ${backupPath}\n`);

// Expected headers (14 columns for LinkedIn)
const EXPECTED_COLUMNS = 14;
const EXPECTED_HEADERS = [
    'Job Id', 'Job Title', 'Company Name', 'Location', 'Job Type', 'Work Type',
    'Posted Time', 'Job URL', 'Description', 'Industry',
    'Source', 'Job Status', 'Experience Level', 'Easy Apply'
];

// Smart CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields;
}

// Find complete job entries (start with job ID pattern)
const jobIdPattern = /^"?\d{7,}"?,"/;

// Split into potential lines
const rawLines = content.split('\n');
console.log(`📝 Raw lines: ${rawLines.length}`);

// Reconstruct valid CSV
const repairedLines: string[] = [];
let currentJobLine = '';
let corruptedCount = 0;
let fixedCount = 0;

for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;

    // Check if this line starts a new job (has job ID pattern)
    if (jobIdPattern.test(line) || i === 0) {
        // Save previous accumulated line if exists
        if (currentJobLine) {
            const fields = parseCSVLine(currentJobLine);
            if (fields.length === EXPECTED_COLUMNS) {
                repairedLines.push(currentJobLine);
            } else if (fields.length > EXPECTED_COLUMNS) {
                // Too many columns - corrupted row, try to fix
                console.log(`⚠️ Row ${repairedLines.length + 1}: ${fields.length} columns (expected ${EXPECTED_COLUMNS})`);
                corruptedCount++;
                // Skip this row - it's too corrupted to fix
            } else if (fields.length < EXPECTED_COLUMNS && fields.length > 5) {
                // Might be fixable - pad with empty values
                const padded = [...fields];
                while (padded.length < EXPECTED_COLUMNS) {
                    padded.push('');
                }
                // Rebuild the line
                const rebuiltLine = padded.map(f => `"${f.replace(/"/g, '""')}"`).join(',');
                repairedLines.push(rebuiltLine);
                fixedCount++;
            }
        }
        currentJobLine = line;
    } else {
        // Continuation of previous line (newline in description)
        // Merge with space instead of newline
        currentJobLine += ' ' + line;
    }
}

// Don't forget the last line
if (currentJobLine) {
    const fields = parseCSVLine(currentJobLine);
    if (fields.length === EXPECTED_COLUMNS) {
        repairedLines.push(currentJobLine);
    }
}

// Write repaired CSV
const outputContent = repairedLines.join('\n');
fs.writeFileSync(csvPath, outputContent, 'utf-8');

console.log(`\n✅ Repair Complete!`);
console.log(`   Original lines: ${rawLines.length}`);
console.log(`   Repaired lines: ${repairedLines.length}`);
console.log(`   Corrupted rows removed: ${corruptedCount}`);
console.log(`   Rows fixed: ${fixedCount}`);
console.log(`\n📁 Output: ${csvPath}`);
