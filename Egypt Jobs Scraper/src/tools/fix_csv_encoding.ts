import * as fs from 'fs';
import * as path from 'path';

/**
 * Fix CSV Encoding Tool
 * Ensures CSV has UTF-8 BOM for proper Arabic display in Excel
 */

const csvPath = path.join(process.cwd(), 'data', 'linkedin_clean_data.csv');

if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found');
    process.exit(1);
}

console.log('🔧 CSV Encoding Fix Tool');
console.log('========================\n');

// Read with UTF-8
let content = fs.readFileSync(csvPath, 'utf8');

// Check if BOM exists
const hasBOM = content.charCodeAt(0) === 0xFEFF;
console.log(`BOM present: ${hasBOM ? 'Yes ✅' : 'No ❌'}`);

// Add BOM if missing
if (!hasBOM) {
    content = '\uFEFF' + content;
    console.log('Adding UTF-8 BOM...');
}

// Write back with UTF-8
fs.writeFileSync(csvPath, content, 'utf8');

console.log('\n✅ CSV encoding fixed!');
console.log('The file now has UTF-8 BOM for proper Arabic display in Excel.');
