const fs = require('fs');
let html = fs.readFileSync('test_bayt_missing.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

let descDiv = null;
$('.t-break').each((i, el) => {
    if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
        descDiv = $(el);
    }
});

console.log('Desc div length:', descDiv ? descDiv.html().length : 0);

if (descDiv) {
    descDiv.find('h2, h3, h4, strong, b, u, p, li').each((i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.length > 0 && text.length < 100) {
            console.log('Tag:', $(el).prop('tagName'), '->', text);
        }
    });
}
