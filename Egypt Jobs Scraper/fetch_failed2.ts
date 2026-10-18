import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';

async function run() {
    const scraper = new BaytScraper();
    const html = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/maintenance-engineer-75178324/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    fs.writeFileSync('test_failed2.html', html);
    console.log('Saved HTML 2.');
}
run().catch(console.error).finally(() => process.exit(0));
