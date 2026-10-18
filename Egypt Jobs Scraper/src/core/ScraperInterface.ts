export interface JobEntity {
    job_id?: string;
    source_job_id: string;
    url: string;

    // Header Info
    title: string;
    company_name: string;
    company_url: string;
    location: string;
    posted_time: string;
    logo_url?: string;

    // Tags
    job_type: string | null;
    work_type: string | null;

    // Details Table
    experience_needed: string | null;
    career_level: string | null;
    education_level: string | null;
    salary: string | null;

    // Content
    job_categories: string | null;
    skills: string | null;

    description: string;
    requirements: string;

    // Stats & Funnel (V3)
    job_status: string;        // Open, Closed
    applicants?: number;       // Total Applicants (optional for LinkedIn)
    open_positions: number;    // Vacancies
    viewed: number;            // Job Views
    in_consideration: number;  // Funnel: In Consideration
    not_selected: number;      // Funnel: Not Selected

    scraped_at: Date;

    // Optional legacy fields if needed for compatibility
    source?: string;

    // LinkedIn Specific
    // LinkedIn Specific
    industry?: string | null;
    easy_apply?: string | boolean | null;
    job_function?: string | null;
    experience_level?: string | null;
    work_mode?: string | null; // e.g. Hybrid, On-site
    valid_through?: string | null;

    // Internal Tracking
    raw_folder_data?: string;
}

export interface IScraper {
    name: string;
    baseUrl: string;
    defaultPageSize: number;
    scrape(options?: ScrapeOptions): Promise<JobEntity[]>;
    getHeaders(): string[];
}

export interface ScrapeOptions {
    limit?: number;
    headless?: boolean;
}

export interface PartialJob {
    source_job_id: string;
    url: string;
    title: string;
    company_name: string;
    location: string;
    list_work_mode?: string; // e.g. "Remote" found in list view
    job_type?: string | null;
    salary?: string | null;
    scraped_at: Date;
}
