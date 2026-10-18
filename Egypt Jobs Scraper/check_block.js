const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_bayt_detail.html', 'utf8'));

console.log('Title:', $('title').text());
console.log('H1:', $('h1').text());

console.log('Is bot blocked?', $('body').text().substring(0, 300));
