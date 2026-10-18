import { BaytScraper } from './src/scrapers/bayt/BaytScraper';

async function test() {
    const scraper = new BaytScraper();
    
    // We can call scrapeJobDetail directly
    const partial = {
        title: 'Front Desk Agent',
        url: 'https://www.bayt.com/en/egypt/jobs/front-desk-agent-5482455/',
        source_job_id: '5482455'
    };
    
    // Initialize browser
    await scraper.scrapeSpecificPage(99999); // dummy to init browser
    
    const result = await scraper['scrapeJobDetail']('5482455', partial as any);
    console.log('Result skills:', result?.skills);
}
test().catch(console.error).finally(() => process.exit(0));
