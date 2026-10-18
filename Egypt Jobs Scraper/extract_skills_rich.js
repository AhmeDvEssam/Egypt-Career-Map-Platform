const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_bayt_detail.html', 'utf8'));

// The description is typically the largest .t-break
let descDiv = null;
$('.t-break').each((i, el) => {
    if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
        descDiv = $(el);
    }
});

console.log('Found descDiv of length', descDiv.html().length);

// We need to parse headings that could be H2, H3, H4, or STRONG, B
const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|nice to have|المؤهلات|المهارات|technical skills|core competencies/i;

let extractedSkills = [];

// iterate through ALL elements inside descDiv in document order
// But actually it's easier to find the matching elements, and then grab all their following siblings until the next heading!
descDiv.find('h2, h3, h4, strong, b, u').each((i, el) => {
    const text = $(el).text().trim().toLowerCase();
    
    // Check if it's one of our target headings
    if (text.length > 0 && text.length < 50 && kwRegex.test(text)) {
        console.log('\nFound matching heading:', text, 'in tag', $(el).prop('tagName'));
        
        // The actual block could be the next sibling of this element, or the next sibling of its parent
        // If it's a STRONG, its parent is likely a P or SPAN. We need to go up until we are a direct child of descDiv or a block level element, then get next siblings
        
        let blockElem = $(el);
        // traverse up to find the block element containing this heading
        while (blockElem.parent().length && !['DIV', 'SECTION', 'ARTICLE', 'MAIN'].includes(blockElem.parent().prop('tagName').toUpperCase())) {
            if (['P', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5'].includes(blockElem.parent().prop('tagName').toUpperCase())) {
                blockElem = blockElem.parent();
                break;
            } else {
                blockElem = blockElem.parent();
            }
        }
        
        console.log('Block element is:', blockElem.prop('tagName'));
        
        // Now get all subsequent siblings until another heading/bold text or end of description
        let current = blockElem.next();
        let content = '';
        while (current.length) {
            // if current is a heading or contains a bold text that looks like a heading, STOP
            if (['H2', 'H3', 'H4', 'H5'].includes(current.prop('tagName'))) break;
            
            // if current is a P that just contains a STRONG, it's probably another heading
            if (current.prop('tagName') === 'P') {
                const strongInP = current.find('strong, b, u');
                if (strongInP.length > 0 && current.text().trim() === strongInP.text().trim() && current.text().length < 50) {
                    break;
                }
            }
            
            // if current is a BR, skip it
            if (current.prop('tagName') === 'BR') {
                current = current.next();
                continue;
            }
            
            content += ' ' + current.text().replace(/\s+/g, ' ').trim();
            current = current.next();
        }
        
        if (content.trim()) {
            console.log('Extracted content:', content.trim().substring(0, 150));
            extractedSkills.push(content.trim());
        } else {
             console.log('Extracted content: [EMPTY]');
        }
    }
});

console.log('\n--- Final Extracted Skills ---');
console.log(extractedSkills.join(' | '));

