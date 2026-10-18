const axios = require('axios');
const fs = require('fs');

async function test() {
    const response = await axios.get('https://www.bayt.com/en/egypt/jobs/front-desk-agent-5482455/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    fs.writeFileSync('test_axios.html', response.data);
    console.log('Saved Axios HTML');
}
test().catch(console.error);
