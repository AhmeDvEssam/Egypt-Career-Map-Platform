const url = 'https://wuzzuf.net/jobs/p/pyqhdkta1ch6-hr-data-analyst-amreyah-cement-cairo-egypt';
const match = url.match(/\/p\/([a-f0-9\-]+)/);
console.log(match ? match[1] : 'no match');
