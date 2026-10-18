const fs = require('fs');
const cheerio = require('cheerio');

for (let file of ['test_qualifications2.html', 'test_qualifications3.html']) {
    console.log(`\n=== Analyzing ${file} ===`);
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html);
    
    $('*').each((i, el) => {
        const tagName = $(el).prop('tagName');
        if (!tagName) return;
        if (['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY', 'META', 'LINK'].includes(tagName.toUpperCase())) return;
        
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length > 0 && text.length < 50 && /qualifications?/i.test(text)) {
            console.log('FOUND MATCH ->', tagName, ':', text);
            console.log('Parent HTML preview:', $(el).parent().html().substring(0, 200));
        }
    });
}
