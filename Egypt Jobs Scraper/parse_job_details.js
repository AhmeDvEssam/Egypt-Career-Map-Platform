const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

$('h2, h3').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text === 'job details') {
        const nextElem = $(el).next('div');
        nextElem.find('[data-automation-id^="label_"]').each((j, labelDiv) => {
            const key = $(labelDiv).text().replace(/\s+/g, ' ').trim();
            const valDiv = $(labelDiv).next('[data-automation-id^="data_"]');
            const value = valDiv.text().replace(/\s+/g, ' ').trim();
            console.log(key, '->', value);
        });
    }
});
