const fs = require('fs');

const content = fs.readFileSync('data/bayt_clean_data_v3.csv', 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

if (lines.length <= 1) {
    console.log("No data rows found yet.");
    process.exit(0);
}

const headers = lines[0].split(',');
const hIdx = (name) => headers.indexOf(name);

// Column indices
const titleIdx = hIdx('Job Title');
const jobTypeIdx = hIdx('Job Type');
const workTypeIdx = hIdx('Work Type');
const expIdx = hIdx('Experience Needed');
const careerIdx = hIdx('Career Level');
const skillsIdx = hIdx('Skills');
const postedIdx = hIdx('Posted Time');
const categoryIdx = hIdx('Internal Category');

// Parsing rows (simple parsing assuming no commas inside unquoted fields, but our fields are quoted so we need a proper regex or simple parser)
function parseCSVLine(text) {
    const ret = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') {
            inQuote = !inQuote;
        } else if (text[i] === ',' && !inQuote) {
            ret.push(cur.trim());
            cur = '';
        } else {
            cur += text[i];
        }
    }
    ret.push(cur.trim());
    return ret;
}

let totalJobs = lines.length - 1;
let skillsPopulated = 0;
let guessedExperience = 0; // count of '0 Years', '0-3 Years', etc. exact strings
let validCategories = 0;
let workTypePopulated = 0;

let sampleData = [];

for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < headers.length - 2) continue; // ignore malformed

    const title = row[titleIdx];
    const skills = row[skillsIdx];
    const exp = row[expIdx];
    const category = row[categoryIdx];
    const workType = row[workTypeIdx];

    if (skills && skills.length > 5 && skills !== 'Not Specified') skillsPopulated++;
    if (exp && ['0 Years', '0-3 Years', '3-5 Years', '5-10 Years', '10+ Years'].includes(exp)) guessedExperience++;
    if (category && category !== 'Other / Uncategorized') validCategories++;
    if (workType && workType !== 'Not Specified') workTypePopulated++;

    if (sampleData.length < 3) {
        sampleData.push({
            title,
            category,
            workType,
            exp,
            skills: skills ? skills.substring(0, 100) + '...' : 'None'
        });
    }
}

console.log(`Total Jobs Scraped (so far): ${totalJobs}`);
console.log(`Jobs with Extracted Skills: ${skillsPopulated} (${((skillsPopulated/totalJobs)*100).toFixed(1)}%)`);
console.log(`Jobs with Categorized Titles: ${validCategories} (${((validCategories/totalJobs)*100).toFixed(1)}%)`);
console.log(`Jobs with Guessed Experience: ${guessedExperience}`);
console.log(`Jobs with Work Type specified (e.g. Remote): ${workTypePopulated}`);

console.log('\n--- Sample Data ---');
sampleData.forEach((s, idx) => {
    console.log(`[${idx + 1}] Title: ${s.title}`);
    console.log(`    Category: ${s.category}`);
    console.log(`    Work Type: ${s.workType}`);
    console.log(`    Experience: ${s.exp}`);
    console.log(`    Skills: ${s.skills}`);
});
