const axios = require('axios');
const fs = require('fs');

(async () => {
    try {
        const url = 'https://forasna.com/job/p/%D9%85%D9%86%D8%AF%D9%88%D8%A8-%D9%85%D8%A8%D9%8A%D8%B9%D8%A7%D8%AA-%D8%AE%D8%A7%D8%B1%D8%AC%D9%8A%D8%A9-%D8%B1%D8%A7%D8%B4%D8%AF%D9%8A%D9%86-%D8%A7%D9%8A%D8%AC%D9%8A%D8%A8%D8%AA-%D9%84%D9%84%D8%AA%D8%AC%D8%A7%D8%B1%D9%87-%D9%85%D8%B5%D8%B1-%D8%A7%D9%84%D8%AC%D9%8A%D8%B2%D8%A9-440265';
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        fs.writeFileSync('detail_dump.html', res.data, 'utf8');
        console.log('Saved to detail_dump.html');
    } catch(e) { console.error(e.message); }
})();
