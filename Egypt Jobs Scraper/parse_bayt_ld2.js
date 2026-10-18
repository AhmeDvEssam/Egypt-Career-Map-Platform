const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_detail.html', 'utf8'));
$('script[type="application/ld+json"]').each((i, el) => {
    try {
        const data = JSON.parse($(el).html());
        console.log('employmentType:', data.employmentType);
        console.log('industry:', data.industry);
        console.log('occupationalCategory:', data.occupationalCategory);
        console.log('jobLocationType:', data.jobLocationType);
        console.log('baseSalary:', data.baseSalary);
    } catch(e) {}
});
