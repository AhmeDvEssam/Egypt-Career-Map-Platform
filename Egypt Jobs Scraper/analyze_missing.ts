import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

async function run() {
    const scraper = new BaytScraper();
    
    // We can call the scrapeJobDetail which we made protected or we can just use withBrowser
    // Let's use withBrowser directly
    const html = await scraper['withBrowser'](async (page) => {
        await page.goto('https://www.bayt.com/en/egypt/jobs/ai-developer-75174853/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    
    fs.writeFileSync('test_bayt_missing.html', html);
    console.log('Saved HTML.');
    
    const $ = cheerio.load(html);
    
    // The description is typically the largest .t-break
    let descDiv: any = null;
    $('.t-break').each((i, el) => {
        if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
            descDiv = $(el);
        }
    });
    
    console.log('Desc div length:', descDiv ? descDiv.html().length : 0);
    
    if (descDiv) {
        console.log('\n--- Examining all potential headings ---');
        descDiv.find('h2, h3, h4, strong, b, u, p').each((i, el) => {
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text.length > 0 && text.length < 100) {
                console.log(`Tag: ${$(el).prop('tagName')} -> ${text}`);
            }
        });
    }
}

run().catch(console.error).finally(() => process.exit(0));
