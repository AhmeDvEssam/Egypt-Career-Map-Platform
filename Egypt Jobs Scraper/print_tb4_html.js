const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications4.html', 'utf8'));
console.log($('.t-break').html());
