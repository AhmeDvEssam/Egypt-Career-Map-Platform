async function testIndeed() {
    const { gotScraping } = await import('got-scraping');
    try {
        console.log('Fetching Indeed page with got-scraping...');
        const response = await gotScraping({
            url: 'https://eg.indeed.com/jobs?q=Hiring&l=Egypt&start=0',
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 120 }],
                devices: ['desktop'],
                locales: ['en-US', 'en']
            }
        });
        
        console.log('Status:', response.statusCode);
        console.log('Body snippet:', response.body.substring(0, 500));
        
        const titleMatch = response.body.match(/<title>(.*?)<\/title>/);
        if (titleMatch) {
            console.log('Title found:', titleMatch[1]);
        }
    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Status:', err.response.statusCode);
            console.error('Body snippet:', err.response.body.substring(0, 500));
        }
    }
}

testIndeed();
