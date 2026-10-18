import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';

async function run() {
    const scraper = new BaytScraper();
    const html = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/spare-parts-warehouse-officer-75174809/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    
    fs.writeFileSync('test_qualifications.html', html);
    console.log('Saved HTML.');
}
run().catch(console.error).finally(() => process.exit(0));
