const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

console.log('--- Skills ---');
$('h2').each((i, el) => {
    if ($(el).text().trim().toLowerCase() === 'skills') {
        const skillsDiv = $(el).next('div');
        console.log(skillsDiv.text().replace(/\s+/g, ' ').trim());
    }
});

console.log('--- Preferred Candidate ---');
$('h2').each((i, el) => {
    if ($(el).text().trim().toLowerCase() === 'preferred candidate') {
        const nextElem = $(el).next('div');
        nextElem.find('[data-automation-id^="label_"]').each((j, labelDiv) => {
            const key = $(labelDiv).text().replace(/\s+/g, ' ').trim();
            const valDiv = $(labelDiv).next('[data-automation-id^="data_"]');
            const value = valDiv.text().replace(/\s+/g, ' ').trim();
            console.log(key, '->', value);
        });
    }
});
