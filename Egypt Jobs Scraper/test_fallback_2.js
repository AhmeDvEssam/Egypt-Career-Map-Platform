const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    try {
        const url = 'https://forasna.com/job/p/%D9%85%D8%AF%D9%8A%D8%B1-%D8%AD%D8%B1%D9%83%D8%A9-%D9%88-%D9%86%D9%82%D9%84-%D9%85%D8%B3%D8%B9%D9%88%D8%AF-%D8%B3%D8%AA%D9%8A%D9%84-%D9%85%D8%B5%D8%B1-%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9-439236';
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
        const $ = cheerio.load(res.data);
        
        const modalTitle = $('.modal-header__content-job-title').text().replace(/\s+/g, ' ').trim();
        let company_name = '';
        const companyMatch = modalTitle.match(new RegExp(' \u0641\u064A \u0634\u0631\u0643\u0629 (.*)'));
        if (companyMatch) {
            company_name = companyMatch[1].trim();
        }
        
        let location = '';
        const h1Text = $('h1').text().replace(/\s+/g, ' ').trim();
        const cleanH1 = h1Text.replace(new RegExp('\u0648\u0638\u0627\u0626\u0641 \u062E\u0627\u0644\u064A\u0629', 'g'), '').trim();
        const cleanH1_2 = cleanH1.replace(new RegExp('\u0648\u0638\u064A\u0641\u0629 \u062E\u0627\u0644\u064A\u0629', 'g'), '').trim();
        let extractedLocation = cleanH1_2.replace('مدير حركة و نقل', '').trim();
        extractedLocation = extractedLocation.replace(/^- /g, '').trim();
        if (extractedLocation) location = extractedLocation;

        console.log("Fallback Company:", company_name);
        console.log("Fallback Location:", location);
    } catch(e) { console.error(e); }
})();
