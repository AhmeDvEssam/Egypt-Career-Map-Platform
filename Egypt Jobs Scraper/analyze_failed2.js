const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed2.html', 'utf8'));
console.log('--- JOB DESCRIPTION ---');
console.log($('h2:contains("Job description")').next().text());
console.log('--- T-BREAK ---');
$('.t-break').each((i, el) => console.log($(el).text()));
