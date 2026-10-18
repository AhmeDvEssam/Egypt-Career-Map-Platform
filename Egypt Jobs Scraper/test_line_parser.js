const fs = require('fs');
const cheerio = require('cheerio');

const files = [
    'test_qualifications.html',
    'test_qualifications2.html',
    'test_qualifications4.html'
];

const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|what you bring|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies/i;

for (let file of files) {
    console.log(`\n\n=== ${file} ===`);
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html);
    
    let descDiv = null;
    $('.t-break').each((i, el) => {
        if ($(el).html().length > (descDiv ? descDiv.html().length : 0)) {
            descDiv = $(el);
        }
    });
    
    if (!descDiv) continue;
    
    let rawHtml = descDiv.html();
    
    // Replace block elements and line breaks with newline characters
    rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/p>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/div>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/li>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/h[1-6]>/gi, '\n');
    
    // Remove all remaining HTML tags
    let textContent = rawHtml.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities (basic ones)
    textContent = textContent.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    
    const lines = textContent.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);
    
    let extractedSkills = [];
    let isCapturing = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line is a header
        const isShort = line.length > 0 && line.length < 60;
        const isBullet = /^[-•*·\d]+\.?/.test(line); // starts with bullet or number
        
        if (isShort && !isBullet) {
            // Is it a skills header?
            if (kwRegex.test(line)) {
                isCapturing = true;
                continue; // skip the header itself
            } else if (isCapturing) {
                // If it's another header, stop capturing?
                // Examples: "Benefits", "Company Description", "Additional Information"
                // But wait, what if it's "3. Technical Skills:" (a bullet that is also a header)? 
                // That's why we check !isBullet
                if (/benefits|what we offer|about us|company|how to apply/i.test(line)) {
                    isCapturing = false;
                }
            }
        }
        
        if (isCapturing) {
            extractedSkills.push(line);
        }
    }
    
    console.log('EXTRACTED SKILLS:');
    console.log(extractedSkills.join('\n'));
}
