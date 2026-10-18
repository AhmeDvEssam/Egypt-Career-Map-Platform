const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

console.log('--- Info from icons ---');
$('.icon').each((i, el) => {
    const parent = $(el).parent();
    const parentText = parent.text().trim().replace(/\s+/g, ' ');
    if (parentText && parentText.length > 2 && parent.prop('tagName').toLowerCase() !== 'button' && parent.prop('tagName').toLowerCase() !== 'a') {
        console.log('Icon:', $(el).attr('class'), '->', parentText);
    }
});
console.log('--- Info from Job Details Card ---');
$('.card .dlist dl').each((i, dl) => {
    const dt = $(dl).find('dt').text().trim();
    const dd = $(dl).find('dd').text().trim().replace(/\s+/g, ' ');
    if (dt) {
        console.log(`DT: ${dt} -> DD: ${dd}`);
    }
});
