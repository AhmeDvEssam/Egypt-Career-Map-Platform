const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));

$('h2, h3, h4, h5, h6').each((i, el) => {
    const text = $(el).text().trim();
    if (text.toLowerCase().includes('skills') || text.toLowerCase().includes('candidate')) {
        console.log($(el).prop('tagName'), text);
        // Find next sibling or parent structure
        const nextElem = $(el).next();
        console.log('Next element is:', nextElem.prop('tagName'));
        console.log('Next element text:', nextElem.text().substring(0, 100).replace(/\s+/g, ' '));
        
        // Also look at parent's next
        const parentNext = $(el).parent().next();
        console.log('Parent Next element is:', parentNext.prop('tagName'));
        console.log('Parent Next text:', parentNext.text().substring(0, 100).replace(/\s+/g, ' '));
    }
});
