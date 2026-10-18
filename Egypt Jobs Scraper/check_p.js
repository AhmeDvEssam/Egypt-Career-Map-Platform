const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_bayt_missing.html', 'utf8'));

$('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text === 'What You Bring' || text === 'Bonus Points For') {
        console.log('HTML of p tag:', $.html(el));
    }
});
