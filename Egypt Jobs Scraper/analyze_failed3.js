const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_failed3.html', 'utf8'));

console.log('--- T-BREAK ---');
let html = '';
$('.t-break').each((i, el) => {
    if ($(el).html().length > html.length) html = $(el).html();
});
const rawHtml = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<\/h[1-6]>/gi, '\n').replace(/<\/ul>/gi, '\n').replace(/<\/ol>/gi, '\n');
let textContent = rawHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const lines = textContent.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);
lines.forEach(l => console.log(l));
