const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications4.html', 'utf8'));
let idx = 0;
$('.t-break').each((i, el) => {
    console.log(`--- INDEX ${idx} ---`);
    console.log($(el).html());
    idx++;
});
