const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

console.log('--- Search for Job Role / Industry ---');
$('*').each((i, el) => {
    // Only check elements with few children to avoid matching body/html
    if ($(el).children().length === 0) {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.toLowerCase().includes('job role') || text.toLowerCase().includes('industry') || text.toLowerCase().includes('category')) {
            console.log('Found:', text);
        }
    }
});
