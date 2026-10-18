const axios = require('axios');

async function test() {
    try {
        const searchRes = await axios.get('https://wuzzuf.net/api/search/job?q=&page[offset]=0&page[limit]=1');
        const id = searchRes.data.data[0].id;
        console.log("Job ID:", id);
        
        const detailRes = await axios.get(`https://wuzzuf.net/api/job/${id}`);
        console.log("Job Details:");
        console.log(JSON.stringify(detailRes.data.data.attributes, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
