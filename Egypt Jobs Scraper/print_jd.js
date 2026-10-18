const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed1.html', 'utf8'));

console.log($('h2:contains("Job description")').next().html());
