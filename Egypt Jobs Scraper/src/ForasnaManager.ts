import { JobCollector } from './scrapers/JobCollector';
import { ForasnaScraper } from './scrapers/forasna/ForasnaScraper';
import path from 'path';
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('Forasna');
    console.log('================================================');
    console.log('   [FORASNA GLOBAL SCRAPER MANAGER v1.0]        ');
    console.log('================================================');

    const csvPath = path.join(__dirname, '..', 'data', 'forasna_clean_data_v1.csv');

    const scraper = new ForasnaScraper();
    
    // Set parameters
    scraper.defaultPageSize = 25; // roughly 20-30 cards per page
    
    const collector = new JobCollector(scraper, csvPath);

    console.log(`\n[ForasnaManager] 🚀 Starting Global Scan...`);
    
    // Forasna uses a simple pagination without keywords for the main feed
    await collector.runCycle();

    console.log('\n[ForasnaManager] ✅ Finished Scrape Cycle.');
}

main().catch(e => {
    console.error('Fatal Error:', e);
});
