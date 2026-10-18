const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

// Look for the elements that contain these icons/text
const ulList = $('ul.list.is-basic').first(); // often Bayt uses ul.list
if (ulList.length) {
    ulList.find('li').each((i, el) => {
        console.log('List Item:', $(el).text().trim().replace(/\s+/g, ' '));
    });
} else {
    // try finding by icons
    console.log('Looking by icons...');
    $('.icon').each((i, el) => {
        const parentText = $(el).parent().text().trim().replace(/\s+/g, ' ');
        if (parentText) {
            console.log('Icon:', $(el).attr('class'), '->', parentText);
        }
    });
}
