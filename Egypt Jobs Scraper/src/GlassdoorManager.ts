import { JobCollector } from './scrapers/JobCollector';
import { GlassdoorScraper } from './scrapers/glassdoor/GlassdoorScraper';
import * as path from 'path';
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('Glassdoor');
    console.log('================================================');
    console.log('   [GLASSDOOR GLOBAL SCRAPER MANAGER v1.0]      ');
    console.log('================================================');

    const csvPath = path.join(__dirname, '..', 'data', 'glassdoor_jobs.csv');
    const scraper = new GlassdoorScraper();
    scraper.defaultPageSize = 30;
    
    const collector = new JobCollector(scraper, csvPath);

    console.log(`\n[GlassdoorManager] 🚀 Starting Global Scan...`);
    await collector.runCycle();

    console.log('\n[GlassdoorManager] ✅ Finished Scrape Cycle.');
}

main().catch(e => {
    console.error('Fatal Error:', e);
});
