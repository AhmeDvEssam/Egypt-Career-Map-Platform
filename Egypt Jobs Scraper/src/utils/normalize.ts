/**
 * strict URL normalization for Wuzzuf Jobs.
 * Used by Cleaner, Collector, and StatusChecker to ensure 100% consistency.
 */
export function normalizeUrl(url: string | undefined | null): string | null {
    if (!url) return null;
    try {
        // 1. Basic trim
        let clean = url.trim();

        // 2. Remove Quoted string artifacts if coming from CSV
        if (clean.startsWith('"') && clean.endsWith('"')) {
            clean = clean.substring(1, clean.length - 1);
        }

        // 3. Lowercase
        clean = clean.toLowerCase();

        // 4. Handle Query Params (?) and Hash (#)
        if (clean.includes('indeed.com')) {
            // For indeed, the query parameter jk= is critical!
            const jkMatch = url.match(/jk=([a-f0-9]+)/i);
            if (jkMatch) {
                return `https://eg.indeed.com/viewjob?jk=${jkMatch[1].toLowerCase()}`;
            }
        }
        
        clean = clean.split('?')[0];
        clean = clean.split('#')[0];

        // 5. Remove Trailing Slash
        if (clean.endsWith('/')) {
            clean = clean.slice(0, -1);
        }

        // 6. Ensure it is a valid Wuzzuf Job URL structure (Optional safety)
        // e.g. https://wuzzuf.net/jobs/p/UUID-Slug
        if (clean.includes('wuzzuf.net/jobs/p/') || clean.includes('wuzzuf.net/internship/')) {
            return clean;
        }

        return clean;
    } catch (e) {
        return null;
    }
}
