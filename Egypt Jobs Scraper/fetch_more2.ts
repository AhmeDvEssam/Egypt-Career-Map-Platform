import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';

async function run() {
    const scraper = new BaytScraper();
    const html = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/creative-and-design-lead-75173473/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    fs.writeFileSync('test_qualifications4.html', html);
    console.log('Saved HTML 4.');
}
run().catch(console.error).finally(() => process.exit(0));
