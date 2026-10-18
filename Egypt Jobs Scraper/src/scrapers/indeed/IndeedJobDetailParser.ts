import * as cheerio from 'cheerio';

export interface JobDetailResult {
    description: string;
    jobType: string;
    careerLevel: string;
    workType: string;
    experience: string;
    postedDate?: string;
}

function stripHtml(text: string): string {
    return (text || '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

function cleanText(text: string): string {
    return stripHtml(text || '').replace(/\s+/g, ' ').trim();
}

function safeJsonParse(raw: string): any | null {
    const trimmed = (raw || '').trim();
    if (!trimmed) return null;
    try {
        return JSON.parse(trimmed);
    } catch {
        const match = trimmed.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

function findJobPosting(value: any): any | null {
    if (!value) return null;
    if (Array.isArray(value)) {
        for (const entry of value) {
            const found = findJobPosting(entry);
            if (found) return found;
        }
        return null;
    }
    if (typeof value === 'object') {
        const type = value['@type'] || value.type;
        if (typeof type === 'string' && type.toLowerCase() === 'jobposting') return value;
        if (Array.isArray(type) && type.some((t: string) => typeof t === 'string' && t.toLowerCase() === 'jobposting')) {
            return value;
        }
        for (const key of Object.keys(value)) {
            const found = findJobPosting(value[key]);
            if (found) return found;
        }
    }
    return null;
}

function extractJobPosting($: cheerio.CheerioAPI): any | null {
    let result: any | null = null;
    $('script[type="application/ld+json"]').each((_index: number, el: any) => {
        if (result) return false;
        const raw = $(el).contents().text();
        const parsed = safeJsonParse(raw);
        const found = findJobPosting(parsed);
        if (found) {
            result = found;
            return false;
        }
        return undefined;
    });
    return result;
}

function normalizeEmploymentType(value: string | string[] | undefined): string {
    if (!value) return '';
    const list = Array.isArray(value) ? value : [value];
    const mapped: string[] = [];
    for (const entry of list) {
        const lower = String(entry || '').toLowerCase();
        if (!lower) continue;
        if (lower.includes('full')) mapped.push('Full-time');
        else if (lower.includes('part')) mapped.push('Part-time');
        else if (lower.includes('contract')) mapped.push('Contract');
        else if (lower.includes('temp')) mapped.push('Temporary');
        else if (lower.includes('intern')) mapped.push('Internship');
    }
    return Array.from(new Set(mapped)).join('+');
}

function mapJobTypeFromText(text: string): string {
    const lower = (text || '').toLowerCase();
    if (lower.includes('full-time') || lower.includes('full time')) return 'Full-time';
    if (lower.includes('part-time') || lower.includes('part time')) return 'Part-time';
    if (lower.includes('contract')) return 'Contract';
    if (lower.includes('temporary') || lower.includes('temp')) return 'Temporary';
    if (/\b(internship|intern)\b/.test(lower)) return 'Internship';
    return '';
}

function normalizeExperienceRequirement(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return `${value} Years`;
    if (typeof value === 'object') {
        const months = value.monthsOfExperience || value.months;
        if (typeof months === 'number') {
            const years = Math.max(1, Math.ceil(months / 12));
            return `${years} Years`;
        }
        const years = value.yearsOfExperience || value.years;
        if (typeof years === 'number') return `${years} Years`;
        if (typeof value.description === 'string') return value.description;
    }
    return '';
}

function inferCareerLevel(title: string, description: string): string {
    const lowerTitle = (title || '').toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const seniorPattern = /\b(senior|sr\.?|lead|principal)\b/;
    const juniorPattern = /\b(junior|jr\.?|associate|entry\s+level)\b/;
    const internPattern = /\b(internship|intern|trainee)\b/;
    const managerPattern = /\b(manager|head|director)\b/;
    const executivePattern = /\b(executive|chief|vp|vice\s+president)\b/;

    if (seniorPattern.test(lowerTitle) || seniorPattern.test(lowerDesc)) return 'Senior';
    if (juniorPattern.test(lowerTitle) || juniorPattern.test(lowerDesc)) return 'Junior/Entry';
    if (internPattern.test(lowerTitle) || internPattern.test(lowerDesc)) return 'Internship';
    if (managerPattern.test(lowerTitle) || /\bleadership\b/.test(lowerDesc) || managerPattern.test(lowerDesc)) return 'Manager';
    if (executivePattern.test(lowerTitle)) return 'Executive';

    return 'Not Specified';
}

function inferWorkType(description: string, jobPosting?: any): string {
    const locationType = jobPosting?.jobLocationType || jobPosting?.applicantLocationRequirements?.name;
    const locationText = Array.isArray(locationType) ? locationType.join(' ') : String(locationType || '');
    const lowerLocation = locationText.toLowerCase();
    const lowerDesc = (description || '').toLowerCase();

    if (lowerLocation.includes('remote') || lowerLocation.includes('telecommute')) return 'Remote';
    if (lowerLocation.includes('hybrid')) return 'Hybrid';
    if (lowerDesc.includes('remote') || lowerDesc.includes('work from home')) return 'Remote';
    if (lowerDesc.includes('hybrid')) return 'Hybrid';
    return 'On-site';
}

function inferExperience(description: string, fallbackText: string): string {
    const match = (description || fallbackText || '').match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
    if (!match) return 'Not Specified';
    const years = parseInt(match[1], 10);
    if (!Number.isFinite(years) || years <= 0 || years > 15) return 'Not Specified';
    return `${years} Years`;
}

export class IndeedJobDetailParser {
    static parse(html: string): JobDetailResult {
        const $ = cheerio.load(html);
        const jobPosting = extractJobPosting($);

        const descriptionRaw =
            jobPosting?.description ||
            $('#jobDescriptionText').html() ||
            $('#jobDescriptionText').text() ||
            $('.jobsearch-JobComponent-description').html() ||
            $('.jobsearch-JobComponent-description').text();
        const description = cleanText(descriptionRaw || '');

        const titleRaw =
            jobPosting?.title ||
            $('h1.jobsearch-JobInfoHeader-title').text() ||
            $('h1').first().text();
        const title = cleanText(titleRaw || '');

        const jobTypeFromJson = normalizeEmploymentType(jobPosting?.employmentType);
        const jobTypeFromHtml = mapJobTypeFromText(
            `${$('#salaryInfoAndJobType').text()} ${$('[data-testid="attribute_snippet_testid"]').text()} ${$('.jobsearch-JobMetadataHeader-item').text()}`
        );
        const jobTypeFromDesc = mapJobTypeFromText(description);
        const jobType = jobTypeFromJson || jobTypeFromHtml || jobTypeFromDesc || 'Not Specified';

        const careerLevel = inferCareerLevel(title, description);
        const workType = inferWorkType(description, jobPosting);

        const experienceSource = normalizeExperienceRequirement(jobPosting?.experienceRequirements) ||
            normalizeExperienceRequirement(jobPosting?.qualifications) ||
            '';
        const experience = inferExperience(description, experienceSource);

        let postedDate = '';
        if (jobPosting?.datePosted) {
            try {
                const pd = new Date(jobPosting.datePosted);
                if (!isNaN(pd.getTime())) postedDate = pd.toISOString();
            } catch (e) {}
        }
        if (!postedDate) {
            const footerText = $('.jobsearch-JobMetadataFooter, span[data-testid="myJobsStateDate"], .date').text();
            const daysMatch = footerText.match(/(\d+)\s*days?\s*ago/i);
            const hoursMatch = footerText.match(/(\d+)\s*hours?\s*ago/i);
            if (daysMatch) {
                postedDate = new Date(Date.now() - parseInt(daysMatch[1], 10) * 86400000).toISOString();
            } else if (hoursMatch) {
                postedDate = new Date(Date.now() - parseInt(hoursMatch[1], 10) * 3600000).toISOString();
            } else if (footerText.toLowerCase().includes('today') || footerText.toLowerCase().includes('just posted')) {
                postedDate = new Date().toISOString();
            }
        }

        return {
            description,
            jobType,
            careerLevel,
            workType,
            experience,
            postedDate
        };
    }
}
