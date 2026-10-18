const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications.html', 'utf8'));
console.log('T-break HTML:', $('.t-break').html());
