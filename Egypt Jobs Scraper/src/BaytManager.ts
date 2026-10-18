import { JobCollector } from './scrapers/JobCollector';
import { BaytScraper } from './scrapers/bayt/BaytScraper';
import path from 'path';
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('Bayt');
    console.log('================================================');
    console.log('     [BAYT GLOBAL SCRAPER MANAGER v1.0]         ');
    console.log('================================================');

    const csvPath = path.join(__dirname, '..', 'data', 'bayt_clean_data_v3.csv');

    const scraper = new BaytScraper();
    
    scraper.defaultPageSize = 20;
    
    const collector = new JobCollector(scraper, csvPath);

    console.log(`\n[BaytManager] dYs? Starting Global Scan...`);
    
    await collector.runCycle();

    console.log('\n[BaytManager] o. Finished Scrape Cycle.');
}

main().catch(e => {
    console.error('Fatal Error:', e);
});
