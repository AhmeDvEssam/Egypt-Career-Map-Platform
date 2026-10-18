const https = require('https');
const cheerio = require('cheerio');

https.get('https://www.bayt.com/en/egypt/jobs/senior-frontend-engineer-react-typescript-data-visualization-75178482/', (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        const $ = cheerio.load(body);
        const html = $('.is-p-0-m.is-m-t-2-m').html();
        if (html) {
            console.log("RAW HTML:");
            console.log(html.substring(0, 1000));
            console.log("\n\nTEXT:");
            const text = html.split(/<br\s*\/?>/).join('\n')
                .replace(/<[^>]+>/g, '\n')
                .replace(/\n+/g, '\n');
            console.log(text.substring(0, 1000));
        } else {
            console.log("No job details div found.");
        }
    });
}).on('error', console.error);
