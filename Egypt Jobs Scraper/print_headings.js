const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed1.html', 'utf8'));
$('h2, h3, h4').each((i, el) => console.log($(el).prop('tagName'), $(el).text().trim()));
