const axios = require('axios');
const cheerio = require('cheerio');
(async () => {
    try {
        const url1 = 'https://forasna.com/' + encodeURI('وظائف-خالية');
        const r1 = await axios.get(url1, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(r1.data);
        
        $('ul.pagination li a').each((i, el) => {
             console.log('Pagination Link:', $(el).text().trim(), '->', $(el).attr('href'));
        });
    } catch(e) { console.log(e.message); }
})();
