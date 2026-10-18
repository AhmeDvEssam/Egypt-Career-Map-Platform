const fs = require('fs');
const html = fs.readFileSync('bayt_sample.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
$('h2').each((i, el) => {
    console.log($(el).text().trim().substring(0, 50));
    console.log('Link:', $(el).find('a').attr('href'));
});
