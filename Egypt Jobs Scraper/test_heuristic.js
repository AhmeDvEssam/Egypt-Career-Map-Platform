const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const cheerio = require('cheerio');

async function testUrl(urlStr) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(urlStr, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);
    let descDiv = null;
    $('.t-break').each((i, el) => {
        if ($(el).html() && $(el).html().length > (descDiv && descDiv.html() ? descDiv.html().length : 0)) {
            descDiv = $(el);
        }
    });

    if(!descDiv) {
        console.log("No .t-break found!");
        return;
    }

    const kwRegex = /skills?|requirements?|required|qualifications?|what we(?:'re| are) looking for|what you(?:'ll| will) need|what you bring|what makes you a good fit|nice to have|bonus points|O U,U.O UU,O O|O U,U.UO OO O|technical skills|core competencies|core technologies|technologies|what you(?:'ll| will) do|responsibilities/i;

    let rawHtml = descDiv.html() || '';
    rawHtml = rawHtml.replace(/<br\s*\/?>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/p>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/div>/gi, '\n');
    rawHtml = rawHtml.replace(/<li[^>]*>/gi, '\n- '); // INJECT BULLET FOR LI
    rawHtml = rawHtml.replace(/<\/li>/gi, '');
    rawHtml = rawHtml.replace(/<\/h[1-6]>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/ul>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/ol>/gi, '\n');
    
    let textContent = rawHtml.replace(/<[^>]+>/g, ' ');
    textContent = textContent.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let isCapturing = false;
    let extractedSkills = [];
    
    console.log("----- LINES -----");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        const isShort = line.length > 0 && line.length < 60;
        const isBullet = /^[-*\d\u2022\u2023\u25E6\u2043\u2219]+\.?/.test(line); 
        
        console.log(`[${isShort ? 'S' : ' '}${isBullet ? 'B' : ' '}] ${line.substring(0, 100)}`);

        if (isShort && !isBullet) {
            if (kwRegex.test(line)) {
                console.log('>>> CAPTURING TRUE (Short & Regex):', line);
                isCapturing = true; 
                continue; 
            } else if (isCapturing) {
                if (/benefits|what we offer|about us|company|how to apply|who we are|our mission/i.test(line)) {
                    console.log('>>> CAPTURING FALSE (Stop word):', line);
                    isCapturing = false;
                }
            }
        }
        
        if (isBullet && !isCapturing) {
            if (/(experience|ability|familiarity|skills?|proficien|knowledge|degree|bachelor|master|capable|understanding|track record|expertise|proven|good command)\b/i.test(line)) {
                console.log('>>> CAPTURING TRUE (Bullet Regex):', line);
                isCapturing = true; 
            }
        }
        
        // Inline headers (e.g. "Experience: 5 years...")
        if (!isCapturing && line.length >= 60 && /(?:experience|requirements?|qualifications?|skills?|responsibilities|nice to have)\s*:/i.test(line)) {
            console.log('>>> CAPTURING TRUE (Inline Header):', line);
            isCapturing = true;
            // Also capture this line because the requirement is IN the line
            extractedSkills.push(line);
            continue;
        }
        
        if (isCapturing) {
            extractedSkills.push(line);
        }
    }
    console.log("----- EXTRACTED -----");
    console.log(extractedSkills);

    // Also test standard headings logic
    let stdSkills = '';
    $('h2, h3, h4, h5, h6, strong, b').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text.length > 0 && text.length < 50 && kwRegex.test(text)) {
            let extracted = $(el).next('div').text().replace(/\s+/g, ' ').trim();
            if(!extracted || extracted.length < 5) extracted = $(el).next('ul').text().replace(/\s+/g, ' ').trim();
            if(!extracted || extracted.length < 5) extracted = $(el).parent().next('div').text().replace(/\s+/g, ' ').trim();
            console.log(`[Standard Heading] '${text}' => ${extracted.substring(0, 50)}...`);
        }
    });

}
const url = process.argv[2] || 'https://www.bayt.com/en/egypt/jobs/painting-process-engineer-75178832/';
testUrl(url);
