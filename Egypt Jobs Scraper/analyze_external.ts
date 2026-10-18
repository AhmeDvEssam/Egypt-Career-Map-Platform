import { BaytScraper } from './src/scrapers/bayt/BaytScraper';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

async function run() {
    const scraper = new BaytScraper();
    
    // Create a dummy job entity
    const dummyPartial = {
        source_job_id: '75174836',
        url: 'https://www.bayt.com/en/egypt/jobs/ai-engineer-75174836/',
        title: 'AI Engineer',
        company_name: 'Flairs Tech',
        location: 'Alexandria, Egypt',
        scraped_at: new Date()
    };
    
    // We can call the scrapeJobDetail which we made protected or we can just use withBrowser
    // Let's use withBrowser directly
    const html = await scraper['withBrowser'](async (page) => {
        await page.goto(dummyPartial.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return await page.content();
    }, true);
    
    fs.writeFileSync('test_bayt_detail.html', html);
    console.log('Saved HTML.');
    
    // Now let's analyze it locally
    const $ = cheerio.load(html);
    console.log('Title:', $('title').text());
    
    // Find where the skills are!
    const textToCheck = ['what we', 'required', 'nice to have', 'qualifications', 'competencies', 'skills'];
    
    $('*').each((i, el) => {
        const tag = $(el).prop('tagName');
        if (!tag || ['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY', 'LINK', 'META'].includes(tag.toUpperCase())) return;
        
        const text = $(el).clone().children().remove().end().text().trim().toLowerCase();
        for (const kw of textToCheck) {
            if (text.includes(kw) && text.length < 50) {
                console.log(`\nFound Keyword: "${kw}" in tag <${tag}>`);
                console.log(`Exact text: "${text}"`);
                console.log(`Class: ${$(el).attr('class')}`);
                
                const nextSibling = $(el).next();
                if (nextSibling.length) {
                    console.log(`Next Sibling Tag: <${nextSibling.prop('tagName')}>`);
                    console.log(`Next Sibling Text (start): ${nextSibling.text().replace(/\s+/g, ' ').substring(0, 100)}`);
                } else {
                    const parentNext = $(el).parent().next();
                    if (parentNext.length) {
                        console.log(`Parent Next Tag: <${parentNext.prop('tagName')}>`);
                        console.log(`Parent Next Text (start): ${parentNext.text().replace(/\s+/g, ' ').substring(0, 100)}`);
                    }
                }
            }
        }
    });

    console.log('\n--- Checking Description div ---');
    console.log('t-break HTML length:', $('.t-break').html()?.length);
    if (!$('.t-break').length) {
        console.log('Could not find .t-break! Looking for alternative description containers...');
        console.log($('[data-automation-id="job-description"]').html()?.length);
    }
}

run().catch(console.error).finally(() => process.exit(0));
