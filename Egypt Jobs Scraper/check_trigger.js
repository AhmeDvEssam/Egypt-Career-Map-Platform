const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test_qualifications2.html', 'utf8');
const $ = cheerio.load(html);
let rawHtml = '';
$('.t-break').each((i, el) => {
    if ($(el).html().length > rawHtml.length) {
        rawHtml = $(el).html();
    }
});
rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
rawHtml = rawHtml.replace(/<\/p>/gi, '\n');
rawHtml = rawHtml.replace(/<\/div>/gi, '\n');
rawHtml = rawHtml.replace(/<\/li>/gi, '\n');
rawHtml = rawHtml.replace(/<\/h[1-6]>/gi, '\n');
let textContent = rawHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const lines = textContent.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);
const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|what you bring|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies/i;

for(let l of lines) {
    const isShort = l.length > 0 && l.length < 60;
    const isBullet = /^[-•*·\d]+\.?/.test(l);
    if (isShort && !isBullet && kwRegex.test(l)) {
        console.log('TRIGGERED ON:', l);
    }
}
