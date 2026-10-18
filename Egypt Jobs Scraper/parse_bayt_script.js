const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));
$('script').each((i, el) => {
    const text = $(el).html();
    if (text && text.includes('jobRole')) {
        const match = text.match(/"jobRole":([^,]+)/);
        if (match) console.log('JobRole ID:', match[1]);
    }
});
