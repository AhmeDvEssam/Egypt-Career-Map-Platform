export type JobSource = 'LinkedIn' | 'Wuzzuf' | 'Indeed' | 'Bayt' | 'Forasna';

export interface ParsedSalary {
  min: number | null;
  max: number | null;
  currency: string | null;
}

export interface CsvRow {
  source: JobSource;
  sourceJobId: string;
  title: string;
  titleNormalized: string;
  companyName: string;
  companyUrl?: string;
  locationRaw?: string;
  locationNormalized?: string;
  description?: string;
  requirements?: string;
  jobUrl: string;
  postedDate?: string;
  jobType?: string;
  workType?: string;
  experienceLevel?: string;
  careerLevel?: string;
  educationLevel?: string;
  jobCategory?: string;
  salaryRaw?: string;
  [key: string]: unknown;
}

export interface FileConfig {
  path: string;
  source?: string;
}

export interface IngestionStats {
  file: string;
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}
