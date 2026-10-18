import { BaytScraper } from './src/scrapers/bayt/BaytScraper';

async function test() {
    const scraper = new BaytScraper();
    console.log('Scraping page 0...');
    const result = await scraper.scrapeSpecificPage(0);
    console.log('Result:', result.foundCards, result.jobs.length);
}

test().catch(console.error).finally(() => process.exit(0));
