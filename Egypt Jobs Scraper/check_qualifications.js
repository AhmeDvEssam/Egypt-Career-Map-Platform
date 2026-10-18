const fs = require('fs');
const html = fs.readFileSync('test_qualifications.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

console.log('All potential headings on page:');
$('*').each((i, el) => {
    const tagName = $(el).prop('tagName');
    if (!tagName) return;
    
    // Ignore script, style, html, head, body, etc.
    if (['SCRIPT', 'STYLE', 'HTML', 'HEAD', 'BODY', 'META', 'LINK'].includes(tagName.toUpperCase())) return;
    
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    if (text.length > 0 && text.length < 50 && /skills?|requirements?|required|qualifications?|nice to have|competencies|what you bring/i.test(text)) {
        console.log($(el).prop('tagName'), '->', text);
    }
});

console.log('\nChecking t-break contents:');
$('.t-break').each((i, el) => {
    console.log('t-break text length:', $(el).text().length);
    if ($(el).text().length > 100) {
        console.log('First 200 chars:', $(el).text().replace(/\s+/g, ' ').substring(0, 200));
    }
});
