const fs = require('fs');
const html = fs.readFileSync('bayt_sample.html', 'utf8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
$('li.has-pointer-d').each((i, el) => {
    const id = $(el).attr('data-job-id');
    const title = $(el).find('h2').text().trim();
    const company = $(el).find('.p10l').text().trim() || $(el).find('b.jb-company').text().trim() || $(el).text().substring(0, 30);
    console.log(id, title, company);
});
