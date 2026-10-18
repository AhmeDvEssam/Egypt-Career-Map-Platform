const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('bayt_sample.html', 'utf8'));
const firstJob = $('h2').first().closest('li');
if(firstJob.length === 0) { console.log('h2 is not inside an li'); } else { console.log(firstJob.html()); }
