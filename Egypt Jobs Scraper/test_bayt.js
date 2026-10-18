const axios = require('axios');
async function test() {
    try {
        const r = await axios.get('https://www.bayt.com/ar/egypt/jobs/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log('Status:', r.status);
        console.log('Length:', r.data.length);
        console.log('Sample:', r.data.substring(0, 200));
        const cards = r.data.match(/class="has-pointer-d/g);
        console.log('Cards found:', cards ? cards.length : 0);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
