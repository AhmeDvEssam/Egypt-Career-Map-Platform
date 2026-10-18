const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications2.html', 'utf8'));
$('.t-break *').each((i, el) => {
    const text = $(el).text().trim();
    if (text.includes('Job Special Requirements')) {
        console.log($(el).prop('tagName'), '->', text.substring(0, 100));
    }
});
