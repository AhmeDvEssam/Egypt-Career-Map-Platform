const axios = require('axios');

async function test() {
    try {
        const searchRes = await axios.get('https://wuzzuf.net/api/search/job?q=&page[offset]=0&page[limit]=20');
        const ids = searchRes.data.data.map(d=>d.id);
        for(const id of ids) {
            const res = await axios.get(`https://wuzzuf.net/api/job/${id}`);
            const attrs = res.data.data.attributes;
            if (attrs.salary) {
                console.log('Salary found for ID', id, ':', JSON.stringify(attrs.salary));
            }
        }
    } catch (e) {
        console.error(e);
    }
}
test();
