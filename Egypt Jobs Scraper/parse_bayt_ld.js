const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));
$('script[type="application/ld+json"]').each((i, el) => {
    console.log('--- JSON-LD ---');
    console.log($(el).html().substring(0, 800));
});
