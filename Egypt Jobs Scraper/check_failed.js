const fs = require('fs');
const html = fs.readFileSync('test_failed.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

console.log('All headings on page:');
$('h2, h3, h4, h5, h6, strong, b, p, u, li').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.length > 0 && text.length < 50 && /skills?|requirements?|required|qualifications?|nice to have|competencies|what you bring/i.test(text)) {
        console.log($(el).prop('tagName'), '->', text);
    }
});

console.log('\nChecking t-break:');
let descDiv = null;
$('.t-break').each((i, el) => {
    if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
        descDiv = $(el);
    }
});
if (descDiv) {
    console.log(descDiv.text().substring(0, 500));
}
