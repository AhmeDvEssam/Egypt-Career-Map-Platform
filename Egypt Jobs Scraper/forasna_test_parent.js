const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
    try {
        const url = 'https://forasna.com/' + encodeURI('وظائف-خالية');
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        
        $('h2.job-title').each((i, el) => {
            const card = $(el).closest('.job-card, .job-item, .box, article, div[class*="job"], .result-wrp, .item-details').first();
            const rawLink = $(el).find('a').attr('href');
            console.log('Title:', $(el).find('span').text().trim(), 'Link:', rawLink);
        });
    } catch(e) {}
})();
