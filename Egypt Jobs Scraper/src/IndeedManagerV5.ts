import { IndeedScraper } from './scrapers/indeed/IndeedScraper';
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('Indeed');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ INDEED MANAGER V5 — Node Pipeline (No Python)      ║');
    console.log('║     API-First | Retry Queue | Metrics | Resume             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const scraper = new IndeedScraper();

    const shutdown = async () => {
        console.log('\n[Manager] 🛑 Shutting down...');
        await scraper.close();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    const SLEEP_BETWEEN_CYCLES_MS = 30 * 60 * 1000; // 30 minutes

    while (true) {
        try {
            console.log(`\n[Manager] 🚀 Starting new scrape cycle at ${new Date().toISOString()}...`);
            await scraper.scrape();
            console.log(`[Manager] ✅ Cycle complete. Sleeping for ${SLEEP_BETWEEN_CYCLES_MS / 60000} minutes...`);
        } catch (err) {
            console.error('[Manager] ❌ Error in scrape cycle:', err);
            console.log('[Manager] ⚠️ Recovering... Sleeping for 5 minutes before retry.');
            await new Promise(r => setTimeout(r, 5 * 60 * 1000));
            continue;
        }

        await new Promise(r => setTimeout(r, SLEEP_BETWEEN_CYCLES_MS));
    }
}

main();
