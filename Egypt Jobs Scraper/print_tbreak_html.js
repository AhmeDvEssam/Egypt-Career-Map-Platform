const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications.html', 'utf8'));
let count = 1;
$('.t-break').each((i, el) => {
    console.log(`--- t-break ${count++} ---`);
    console.log($(el).html());
});
