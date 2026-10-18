const fs = require('fs');
const html = fs.readFileSync('test_failed.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

let skills = '';
const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|what you bring|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies/i;

$('h2, h3, h4').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    
    // Extract standard skills if they are in a dedicated section
    if (text.length > 0 && text.length < 50 && kwRegex.test(text)) {
        const extracted = $(el).next('div').text().replace(/\s+/g, ' ').trim();
        if (extracted.length > 5 && !skills.includes(extracted)) {
            skills = skills ? skills + ' | ' + extracted : extracted;
        }
    }
});
console.log('EXTRACTED:', skills);
