const { chromium } = require('playwright');
const fs = require('fs');
const cheerio = require('cheerio');

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('Navigating to job page...');
    await page.goto('https://www.bayt.com/en/egypt/jobs/ai-engineer-75174836/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const html = await page.content();
    fs.writeFileSync('test_bayt_detail.html', html);
    
    const $ = cheerio.load(html);
    
    console.log('\n--- Analyzing Elements with specific keywords ---');
    
    const keywords = ['what we\'re looking for', 'required', 'nice to have', 'job requirements', 'qualifications', 'technical skills', 'core competencies', 'skills'];
    
    // We will look at all text nodes and elements to see how they are structured
    $('*').each((i, el) => {
        // Skip script, style, html, head, body
        const tag = $(el).prop('tagName');
        if (!tag || ['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY', 'LINK', 'META'].includes(tag.toUpperCase())) return;
        
        // We only care about elements that directly contain text
        // or have text that matches our keywords exactly (trimmed)
        const text = $(el).clone().children().remove().end().text().trim().toLowerCase();
        
        for (const kw of keywords) {
            if (text.includes(kw) && text.length < 50) { // Keep it short to find headings/bold text
                console.log(`\nFound Keyword: "${kw}" in tag <${tag}>`);
                console.log(`Exact text: "${text}"`);
                console.log(`Class: ${$(el).attr('class')}`);
                
                // Let's see what is right after it (next sibling or parent's next sibling)
                const nextSibling = $(el).next();
                if (nextSibling.length) {
                    console.log(`Next Sibling Tag: <${nextSibling.prop('tagName')}>`);
                    console.log(`Next Sibling Text (start): ${nextSibling.text().replace(/\\s+/g, ' ').substring(0, 100)}`);
                } else {
                    const parentNext = $(el).parent().next();
                    if (parentNext.length) {
                        console.log(`Parent Next Tag: <${parentNext.prop('tagName')}>`);
                        console.log(`Parent Next Text (start): ${parentNext.text().replace(/\\s+/g, ' ').substring(0, 100)}`);
                    }
                }
            }
        }
    });

    console.log('\n--- Checking t-break content ---');
    console.log($('.t-break').html().substring(0, 1000));
    
    await browser.close();
})();
