const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('detail_dump.html', 'utf8');
const $ = cheerio.load(html);
$('script[type="application/ld+json"]').each((i, el) => {
    console.log("JSON-LD:", $(el).html());
});
