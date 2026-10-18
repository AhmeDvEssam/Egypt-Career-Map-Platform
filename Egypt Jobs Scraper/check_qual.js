const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications4.html', 'utf8'));

$('.t-break *').each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('qualification')) {
        console.log($(el).prop('tagName'), '->', text.substring(0, 100));
    }
});
