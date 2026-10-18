const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('bayt_sample.html', 'utf8');
const $ = cheerio.load(html);
const el = $('h2').first().closest('li');
console.log(el.text().replace(/\s+/g, ' '));
