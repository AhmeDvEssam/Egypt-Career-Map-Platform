const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test_bayt_detail.html', 'utf8'));

const strong = $('strong').filter((i, el) => $(el).text().trim().toLowerCase() === 'required');
if (strong.length) {
    console.log('Required parent element:', strong.parent().prop('tagName'), strong.parent().attr('class'));
    console.log('Required parent parent:', strong.parent().parent().prop('tagName'), strong.parent().parent().attr('class'));

    console.log('\nWhat comes after Required?');
    console.log('Next sibling:', strong.parent().next().prop('tagName'));
    console.log('Next sibling text:', strong.parent().next().text().replace(/\s+/g, ' ').substring(0, 100));
}

// Find main description div by searching for the "What We're Looking For" text
$('*').each((i, el) => {
    if ($(el).text().includes("What We're Looking For") && $(el).children().length > 5) {
        console.log('\nPossible Description Container:', $(el).prop('tagName'), 'Class:', $(el).attr('class'));
    }
});

// Let's check the text of .t-break
console.log('\nt-break length:', $('.t-break').length);
$('.t-break').each((i, el) => {
    console.log('t-break', i, 'html length:', $(el).html().length);
    console.log('t-break', i, 'text:', $(el).text().substring(0, 100));
});

// Let's check what contains the full text
const fullHtml = fs.readFileSync('test_bayt_detail.html', 'utf8');
const lines = fullHtml.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("What We're Looking For")) {
        console.log('\nFound keyword on line', i);
        console.log('Line HTML:', lines[i].substring(0, 200));
    }
}
