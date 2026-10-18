const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
    try {
        const url = 'https://forasna.com/' + encodeURI('وظائف-خالية');
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(res.data);
        const cardHtml = $('a[href*="/job/p/"]').first().parent().parent().html();
        fs.writeFileSync('forasna_card.html', cardHtml || 'No card found');
        console.log('Saved card HTML');
    } catch(e) { console.error(e.message); }
})();
