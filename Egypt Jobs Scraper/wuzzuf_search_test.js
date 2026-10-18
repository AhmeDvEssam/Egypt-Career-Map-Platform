const axios = require('axios');
async function test() {
    try {
        const searchRes = await axios.get('https://wuzzuf.net/api/search/job?q=&page[offset]=0&page[limit]=1');
        console.log(JSON.stringify(searchRes.data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
