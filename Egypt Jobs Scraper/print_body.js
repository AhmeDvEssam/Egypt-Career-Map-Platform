const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed1.html', 'utf8'));
console.log($('body').text().replace(/\s+/g, ' ').substring(0, 1000));
