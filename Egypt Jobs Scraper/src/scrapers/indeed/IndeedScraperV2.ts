import { IndeedScraper } from './IndeedScraper';

export class IndeedScraperV2 {
    private scraper: IndeedScraper;

    constructor() {
        this.scraper = new IndeedScraper();
    }

    async scrape() {
        return this.scraper.scrape();
    }

    async close() {
        return this.scraper.close();
    }
}
