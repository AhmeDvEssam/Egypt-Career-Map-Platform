import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';

async function run() {
    const scraper = new BaytScraper();
    const html = await scraper['withBrowser'](async (page: any) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/fintech-full-stack-software-engineer-node-js-react-native-security-75178478/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    fs.writeFileSync('test_failed3.html', html);
    console.log('Saved HTML 3.');
}
run().catch(console.error).finally(() => process.exit(0));
