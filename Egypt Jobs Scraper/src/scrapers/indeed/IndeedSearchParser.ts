import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import type { AnyNode } from 'domhandler';

export interface SearchJob {
    jobKey?: string;
    jobUrl?: string;
    title: string;
    company: string;
    location: string;
    snippet: string;
    postedDate: string;
    isSponsored: boolean;
}

export interface SearchParseResult {
    jobs: SearchJob[];
    pageFingerprint: string;
}

function buildCanonicalUrl(jobKey?: string, href?: string, baseUrl?: string): string {
    if (jobKey) return `https://eg.indeed.com/viewjob?jk=${jobKey}`;
    if (href) {
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) return `${baseUrl || 'https://eg.indeed.com'}${href}`;
    }
    return '';
}

function extractJobKey(text?: string): string {
    if (!text) return '';
    const match = text.match(/jk=([a-f0-9]+)/i);
    return match ? match[1] : '';
}

function hashFingerprint(values: string[]): string {
    const input = values.filter(Boolean).join('|');
    return crypto.createHash('sha1').update(input).digest('hex');
}

export class IndeedSearchParser {
    static parse(html: string, baseUrl: string): SearchParseResult {
        const $ = cheerio.load(html);
        const jobMap = new Map<string, SearchJob>();

        const cardSelectors = ['.job_seen_beacon', '[data-jk]'];
        const cards: AnyNode[] = [];

        for (const selector of cardSelectors) {
            $(selector).each((_, el) => {
                cards.push(el);
            });
        }

        for (const card of cards) {
            const node = $(card);
            const jobKey = node.attr('data-jk') || extractJobKey(node.find('a[href*="jk="]').attr('href'));
            if (!jobKey) continue;

            const title = (node.find('h2.jobTitle span').first().text() || node.find('a[data-jk]').text() || node.find('h2 a').text()).trim();
            const company = (node.find('[data-testid="company-name"]').text() || node.find('.companyName').text()).trim();
            const location = (node.find('[data-testid="text-location"]').text() || node.find('.companyLocation').text()).trim();
            const snippet = (node.find('.job-snippet').text() || '').replace(/\s+/g, ' ').trim();
            const postedDate = (node.find('.date').text() || node.find('[data-testid="posted-date"]').text()).trim();

            const href = node.find('a[href*="jk="]').attr('href') || '';
            const jobUrl = buildCanonicalUrl(jobKey, href, baseUrl);

            const sponsoredText = node.find('.sponsored, [data-testid="sponsored-label"]').text().toLowerCase();
            const isSponsored = sponsoredText.includes('sponsored');

            const key = jobKey || jobUrl;
            if (!key) continue;

            if (!jobMap.has(key)) {
                jobMap.set(key, {
                    jobKey,
                    jobUrl,
                    title,
                    company,
                    location,
                    snippet,
                    postedDate,
                    isSponsored
                });
            }
        }

        const jobs = Array.from(jobMap.values());
        const fingerprint = hashFingerprint(jobs.map(job => job.jobKey || job.jobUrl || ''));

        return { jobs, pageFingerprint: fingerprint };
    }
}
