const fs = require('fs');
const html = fs.readFileSync('test_failed.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

$('h2, h3, h4').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text === 'skills') {
        console.log('Next tag:', $(el).next().prop('tagName'));
        console.log('Next tag class:', $(el).next().attr('class'));
        console.log('Next div text:', $(el).next('div').text().trim().substring(0, 100));
        console.log('Next tag text:', $(el).next().text().trim().substring(0, 100));
    }
});
