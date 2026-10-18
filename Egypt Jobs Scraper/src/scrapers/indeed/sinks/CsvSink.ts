import * as fs from 'fs';
import * as path from 'path';

export interface JobRecord {
    title: string;
    company: string;
    location: string;
    postedDate: string;
    url: string;
    source: string;
    description: string;
    jobType: string;
    careerLevel: string;
    workType: string;
    category: string;
    experience: string;
    jobKey: string;
    queryKeyword: string;

    firstSeenAt: string;
    lastSeenAt: string;
    descriptionStatus: string;
}

export interface JobSink {
    init(): void;
    write(job: JobRecord): void;
    close(): void;
}

const HEADERS = [
    'Job Title',
    'Company Name',
    'Location',
    'Posted Date Raw',
    'Job URL',
    'Source',
    'Description',
    'Job Type',
    'Career Level',
    'Work Type',
    'Job Category',
    'Years of Experience',
    'Job Key',
    'Query Keyword',
    'First Seen At',
    'Last Seen At',
    'Description Status'
];

export class CsvSink implements JobSink {
    private csvPath: string;

    constructor(csvPath: string) {
        this.csvPath = csvPath;
        const dir = path.dirname(csvPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    init() {
        if (!fs.existsSync(this.csvPath)) {
            fs.writeFileSync(this.csvPath, this.arrayToCsvRow(HEADERS));
        }
    }

    write(job: JobRecord) {
        const row = [
            job.title,
            job.company,
            job.location,
            job.postedDate,
            job.url,
            job.source,
            job.description,
            job.jobType,
            job.careerLevel,
            job.workType,
            job.category,
            job.experience,
            job.jobKey,
            job.queryKeyword,
            job.firstSeenAt,
            job.lastSeenAt,
            job.descriptionStatus
        ];
        fs.appendFileSync(this.csvPath, this.arrayToCsvRow(row));
    }

    close() { }

    private arrayToCsvRow(arr: string[]): string {
        return arr
            .map(text => {
                const safe = (text || '').replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
                return `"${safe}"`;
            })
            .join(',') + '\n';
    }
}
