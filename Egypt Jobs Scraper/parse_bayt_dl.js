const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));
$('dl').each((i, el) => {
    const dt = $(el).find('dt').text().trim();
    const dd = $(el).find('dd').text().replace(/\s+/g, ' ').trim();
    if (dt) console.log(dt, ':', dd);
});
