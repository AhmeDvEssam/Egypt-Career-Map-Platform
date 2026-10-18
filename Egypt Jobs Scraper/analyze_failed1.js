const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed1.html', 'utf8'));
let rawHtml = '';
$('.t-break').each((i, el) => {
    if ($(el).html().length > rawHtml.length) {
        rawHtml = $(el).html();
    }
});
rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<\/h[1-6]>/gi, '\n').replace(/<\/ul>/gi, '\n').replace(/<\/ol>/gi, '\n');
let textContent = rawHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const lines = textContent.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);
lines.forEach(l => console.log(l));
