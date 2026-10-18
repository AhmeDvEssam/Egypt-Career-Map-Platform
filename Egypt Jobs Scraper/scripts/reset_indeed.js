const fs = require('fs');
const path = require('path');

const files = [
    'data/indeed_known_ids.json',
    'data/indeed_v5_state.json',
    'data/indeed_clean_data.csv',
    'data/indeed_state.json',
    'data/indeed_jobs.csv',
    'data/indeed_session'
];

console.log('🗑️  Resetting Indeed Scraper State...');

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
        try {
            const stat = fs.lstatSync(p);
            if (stat.isDirectory()) {
                fs.rmSync(p, { recursive: true, force: true });
            } else {
                fs.unlinkSync(p);
            }
            console.log(`✅ Deleted ${f}`);
        } catch (e) {
            console.error(`❌ Failed to delete ${f}: ${e.message}`);
        }
    } else {
        console.log(`ℹ️  ${f} not found (already clean)`);
    }
});

console.log('\n✨ State cleared! You can now run: npm run start:indeed:v5');
