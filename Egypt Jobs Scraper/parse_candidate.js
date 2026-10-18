const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

$('h2').each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('preferred candidate')) {
        const nextElem = $(el).next();
        
        console.log('--- Preferred Candidate ---');
        // Let's assume it's a list or div with flex
        nextElem.find('.t-mute').each((j, mute) => {
            const key = $(mute).text().replace(/\s+/g, ' ').trim();
            const value = $(mute).next().text().replace(/\s+/g, ' ').trim();
            if(key) console.log(key, '->', value);
        });

        // if the above fails, let's just log the HTML of the div
        if (nextElem.find('.t-mute').length === 0) {
            console.log(nextElem.html());
        }
    }
});
