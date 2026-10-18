const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_qualifications.html', 'utf8'));
console.log('Title:', $('title').text());
console.log('Body text length:', $('body').text().length);
