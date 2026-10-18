const axios = require('axios');
async function test() {
    try {
        const searchRes = await axios.get('https://wuzzuf.net/api/search/job?q=&page[offset]=0&page[limit]=1');
        const id = searchRes.data.data[0].id;
        const res = await axios.get(`https://wuzzuf.net/api/job/${id}?include=company`);
        console.log("Keys in res.data:", Object.keys(res.data));
        console.log("Included length:", res.data.included ? res.data.included.length : 0);
        if (res.data.included) console.log(JSON.stringify(res.data.included, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
