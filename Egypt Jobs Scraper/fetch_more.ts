import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';

async function run() {
    const scraper = new BaytScraper();
    const html = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/civil-technical-office-manager-infrastructure-structure-bridges-75170977/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    fs.writeFileSync('test_qualifications2.html', html);
    console.log('Saved HTML 2.');

    const html2 = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/license-owner-operator-cairo-75169563/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    fs.writeFileSync('test_qualifications3.html', html2);
    console.log('Saved HTML 3.');
}
run().catch(console.error).finally(() => process.exit(0));
