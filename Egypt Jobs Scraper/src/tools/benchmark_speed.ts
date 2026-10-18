
import { WuzzufScraper } from '../scrapers/wuzzuf/WuzzufScraper';

async function benchmark() {
    console.log('🚀 Starting Benchmark...');

    const scraper = new WuzzufScraper('');
    const start = Date.now();

    try {
        console.log('Testing Page 0...');
        const pageStart = Date.now();
        const result = await scraper.scrapeSpecificPage(0);
        const pageEnd = Date.now();

        console.log(`✅ Page 0 Complete.`);
        console.log(`- Time Taken: ${((pageEnd - pageStart) / 1000).toFixed(2)} seconds`);
        console.log(`- Cards Found: ${result.foundCards}`);
        console.log(`- Jobs Extracted: ${result.jobs.length}`);

        if (result.jobs.length > 0) {
            console.log(`- Avg Time/Job: ${((pageEnd - pageStart) / result.jobs.length / 1000).toFixed(2)}s`);

            // Show job_categories for verification
            console.log('\n📊 Job Categories Sample:');
            result.jobs.slice(0, 5).forEach((job: any, i: number) => {
                console.log(`  ${i + 1}. ${job.title}: "${job.job_categories || '(empty)'}"`);
            });
        }

    } catch (e) {
        console.error('Benchmark Failed:', e);
    } finally {
        console.log('Scraper prototype:', Object.getPrototypeOf(scraper)?.constructor?.name);
        console.log('Has closeBrowser:', typeof (scraper as any).closeBrowser);
        if (typeof (scraper as any).closeBrowser === 'function') {
            await (scraper as any).closeBrowser();
        } else {
            console.warn('closeBrowser not available, skipping cleanup.');
        }
        console.log('Done.');
    }
}

benchmark();
