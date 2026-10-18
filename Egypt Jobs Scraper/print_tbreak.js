const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications2.html', 'utf8'));
console.log($('.t-break').text());
