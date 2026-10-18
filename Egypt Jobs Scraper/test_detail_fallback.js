const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('detail_dump.html', 'utf8');
const $ = cheerio.load(html);

const modalTitle = $('.modal-header__content-job-title').text().replace(/\s+/g, ' ').trim();
let extractedCompany = '';
const companyMatch = modalTitle.match(new RegExp(Buffer.from('INmB2Yog2LTYsdmD2Kkg', 'base64').toString('utf8') + '(.*)'));
if (companyMatch) extractedCompany = companyMatch[1].trim();

const h1Text = $('h1').text().replace(/\s+/g, ' ').trim();
const cleanH1 = h1Text.replace(new RegExp(Buffer.from('2YjYuNin2KbZgSDYrtin2YTZitip', 'base64').toString('utf8'), 'g'), '').trim();
const jobTitle = 'مندوب مبيعات خارجية';
let extractedLocation = cleanH1.replace(jobTitle, '').trim();
extractedLocation = extractedLocation.replace(/^- /g, '').trim();

console.log("Company:", extractedCompany);
console.log("Location:", extractedLocation);
