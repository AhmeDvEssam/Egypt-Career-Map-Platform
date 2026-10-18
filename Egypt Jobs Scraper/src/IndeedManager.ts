import { Cleaner } from './utils/Cleaner';
import { JobCollector } from './scrapers/JobCollector';
import * as path from 'path';
import { IndeedBrowserScraper } from './scrapers/indeed/IndeedBrowserScraper';

import { KEYWORD_DATABASE } from './LinkedInManager';
import { askResumeOrRestart } from './utils/promptResume';

const CSV_FILE = path.join(__dirname, '../data/indeed_clean_data_v2.csv');

async function main() {
    await askResumeOrRestart('Indeed');
    console.log('================================================');
    console.log('   [INDEED GLOBAL SCRAPER MANAGER v6.0]  ');
    console.log('=================================================');
    console.log('Mode: Stealth Playwright Extraction');
    console.log('Target: ' + CSV_FILE);

    const cleaner = new Cleaner(CSV_FILE);
    const initialIds = await cleaner.loadKnownIds();
    console.log(`[IndeedManager] Loaded ${initialIds.size} known Job IDs.`);

    const scraper = new IndeedBrowserScraper();
    
    // Check if user is logged into Indeed in the persistent browser profile
    const isLoggedIn = await scraper.checkIsLoggedIn();
    if (isLoggedIn) {
        console.log('[IndeedManager] 👤 User session detected! Deep multi-page scanning active.');
        scraper.fetchTotalJobs = async () => 150;
    } else {
        console.log('[IndeedManager] 🌐 Guest Mode Active: Scraping Page 1 across all 200+ Egyptian keywords.');
        console.log('[IndeedManager] 💡 Bypassing Indeed sign-in wall seamlessly.');
        scraper.fetchTotalJobs = async () => 15;
    }
    scraper.defaultPageSize = 15;

    // Use the massive 200+ keyword database from LinkedIn for comprehensive coverage
    const keywords = KEYWORD_DATABASE.map(k => k.keyword);
    const location = 'Egypt';

    while (true) {
        try {
            for (const keyword of keywords) {
                console.log(`\n[IndeedManager] Scraping Keyword: "${keyword}"`);
                
                scraper.currentKeyword = keyword;
                scraper.currentLocation = location;
                
                const collector = new JobCollector(scraper, CSV_FILE);
                
                const result = await collector.runCycle();
                console.log(`[IndeedManager] Keyword "${keyword}" Result: ${result.stoppedReason}, New Jobs: ${result.newJobs}`);
                
                await new Promise(r => setTimeout(r, 5000));
            }

            await scraper.closeBrowser();

            console.log(`\n[IndeedManager] Full Cycle Complete. Sleeping for 30 minutes...`);
            await new Promise(r => setTimeout(r, 30 * 60 * 1000));

        } catch (e: any) {
            console.error('[IndeedManager] CRITICAL CRASH:', e);
            console.log('[IndeedManager] Restarting in 30 seconds...');
            await new Promise(r => setTimeout(r, 30000));
        }
    }
}

main();