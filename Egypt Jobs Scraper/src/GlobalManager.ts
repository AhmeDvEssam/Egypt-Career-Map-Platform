
import { Cleaner } from './utils/Cleaner';
import { JobCollector } from './scrapers/JobCollector';
import * as path from 'path';
import { WuzzufScraper } from './scrapers/wuzzuf/WuzzufScraper';
import { askResumeOrRestart } from './utils/promptResume';

const CSV_FILE = path.join(__dirname, '../data/wuzzuf_clean_data_v3.csv');
const SLEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 Minutes Sleep after full cycle

async function main() {
    await askResumeOrRestart('Wuzzuf');
    console.log('================================================');
    console.log('   🌍 Wuzzuf GLOBAL Scraper Manager v3.0 🌍   ');
    console.log('================================================');
    console.log('Mode: GLOBAL SEQUENTIAL SCAN (No Categories)');
    console.log('Target: ' + CSV_FILE);
    console.log('Strategy: Scan Page 0 -> End (Verified Limit > 6000)');
    console.log('------------------------------------------------');

    const cleaner = new Cleaner(CSV_FILE);

    // Initial Load
    const initialIds = await cleaner.loadKnownIds();
    console.log(`[GlobalManager] Loaded ${initialIds.size} known Job IDs.`);

    while (true) {
        try {
            console.log('\n[GlobalManager] 🧹 Pre-flight Cleanup...');
            await cleaner.clean();

            console.log('[GlobalManager] 🚀 Starting Global Scan...');

            // 1. Instantiate Global Scraper (No Filter)
            const wuzzufScraper = new WuzzufScraper('');

            // 2. Instantiate Collector
            // Note: JobCollector is already configured for "Turbo Mode" (No delay, High Dup Limit)
            const collector = new JobCollector(wuzzufScraper, CSV_FILE);

            // 3. Run!
            const result = await collector.runCycle();

            console.log(`\n[GlobalManager] ✅ Cycle Result: ${result.stoppedReason}`);
            console.log(`[GlobalManager]    New Jobs: ${result.newJobs}`);
            console.log(`[GlobalManager]    Pages Scanned: ${result.scannedPages}`);

            // CLEANUP: Close Browser to free resources
            await wuzzufScraper.closeBrowser();

            // 4. Verify & Sleep
            const finalIds = await cleaner.loadKnownIds();
            console.log(`[Stats] Total Database Size: ${finalIds.size} Jobs`);

            console.log(`[GlobalManager] 💤 Sleeping for 10 minutes...`);
            await new Promise(r => setTimeout(r, SLEEP_INTERVAL_MS));

        } catch (e: any) {
            console.error('[GlobalManager] 💥 CRITICAL CRASH:', e);
            console.log('[GlobalManager] Restarting in 30 seconds...');
            await new Promise(r => setTimeout(r, 30000));
        }
    }
}

main();
