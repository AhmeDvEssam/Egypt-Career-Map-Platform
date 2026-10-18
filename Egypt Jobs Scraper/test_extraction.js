const fs = require('fs');
let html = fs.readFileSync('test_bayt_missing.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);

let descDiv = null;
$('.t-break').each((i, el) => {
    if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
        descDiv = $(el);
    }
});

let skills = '';
const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|what you bring|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies/i;

if (descDiv) {
    descDiv.find('h2, h3, h4, strong, b, u, p').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        
        if (text.length > 0 && text.length < 50 && kwRegex.test(text)) {
            if ($(el).attr('data-extracted')) return;
            $(el).attr('data-extracted', 'true');
            $(el).parent().attr('data-extracted', 'true');

            let blockElem = $(el);
            
            while (blockElem.parent().length && !['DIV', 'SECTION', 'ARTICLE', 'MAIN'].includes(blockElem.parent().prop('tagName').toUpperCase())) {
                if (['P', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5'].includes(blockElem.parent().prop('tagName').toUpperCase())) {
                    blockElem = blockElem.parent();
                    break;
                } else {
                    blockElem = blockElem.parent();
                }
            }

            let current = blockElem.next();
            let content = '';
            while (current.length) {
                const currentTag = current.prop('tagName') ? current.prop('tagName').toUpperCase() : '';
                const currentText = current.text().trim().toLowerCase();
                
                if (['H2', 'H3', 'H4', 'H5'].includes(currentTag)) break;
                
                if (currentTag === 'P') {
                    const strongInP = current.find('strong, b, u');
                    if (strongInP.length > 0 && currentText === strongInP.text().trim().toLowerCase() && currentText.length < 50) {
                        break;
                    }
                    if (currentText.length < 50 && kwRegex.test(currentText)) {
                        break;
                    }
                }
                
                if (currentTag === 'BR') {
                    current = current.next();
                    continue;
                }
                
                content += ' ' + current.text().replace(/\s+/g, ' ').trim();
                current = current.next();
            }
            
            if (content.trim()) {
                skills = skills ? skills + ' | ' + content.trim() : content.trim();
            }
        }
    });
}
console.log('EXTRACTED SKILLS:');
console.log(skills);
