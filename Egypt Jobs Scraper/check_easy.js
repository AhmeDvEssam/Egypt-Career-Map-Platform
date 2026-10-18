const fs = require('fs');
const html = fs.readFileSync('test_easy_apply.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

console.log('Using old logic:');
$('h2, h3, h4').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (/skills?|requirements?/i.test(text)) {
        console.log('Found Header:', text);
        console.log('Next div text:', $(el).next('div').text().replace(/\s+/g, ' ').substring(0, 100));
    }
});

console.log('\nChecking what we missed...');
console.log('Is there a .t-break?');
$('.t-break').each((i, el) => {
    console.log('t-break length:', $(el).html().length);
});
