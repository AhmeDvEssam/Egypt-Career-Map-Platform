import { WuzzufScraper } from './src/scrapers/wuzzuf/WuzzufScraper';

async function test() {
    const scraper = new WuzzufScraper();
    const res = await scraper.detail('https://wuzzuf.net/jobs/p/b1217889-34a5-4601-9de1-dbed69e1e08e');
    console.log("Company:", res.parsedData.company_name);
    console.log("Exp:", res.parsedData.experience_needed);
}
test();
