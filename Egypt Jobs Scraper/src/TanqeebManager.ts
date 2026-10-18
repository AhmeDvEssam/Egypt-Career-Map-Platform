import { JobCollector } from './scrapers/JobCollector';
import { TanqeebScraper } from './scrapers/tanqeeb/TanqeebScraper';
import path from 'path';
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('Tanqeeb');
    console.log('================================================');
    console.log('   [TANQEEB GLOBAL SCRAPER MANAGER v1.0]        ');
    console.log('================================================');

    const csvPath = path.join(__dirname, '..', 'data', 'tanqeeb_jobs.csv');
    const scraper = new TanqeebScraper();
    
    // Set parameters
    scraper.defaultPageSize = 25; // roughly 25 cards per page
    
    const collector = new JobCollector(scraper, csvPath);

    console.log(`\n[TanqeebManager] 🚀 Starting Global Scan...`);
    
    // Tanqeeb uses global feed pagination
    await collector.runCycle();

    console.log('\n[TanqeebManager] ✅ Finished Scrape Cycle.');
}

main().catch(e => {
    console.error('Fatal Error:', e);
});
