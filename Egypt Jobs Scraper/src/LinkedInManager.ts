import { LinkedInBrowserScraper } from './scrapers/linkedin/LinkedInBrowserScraper';
import { JobCollector } from './scrapers/JobCollector';
import { networkHealth, NetworkHealthCheck } from './utils/NetworkHealthCheck';
import { keepAwake } from './utils/KeepAwake';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
//                    🔥 ENTERPRISE LINKEDIN MANAGER v3.0 🔥
// ============================================================================
// Features:
// - Smart Keyword Scheduler (rotates keywords daily)
// - Priority Queue (high-yield keywords first)
// - Smart Coverage Algorithm (tracks keyword performance)
// - Auto-healing (recovers from errors)
// - ✨ NEW: Network Health Check (waits for connection recovery)
// - ✨ NEW: Failed Job Retry Queue (no job left behind)
// - ✨ NEW: Keep Awake (prevents system sleep)
// - Continuous running (never stops)
// ============================================================================

const SLEEP_BETWEEN_CYCLES_MS = 10 * 60 * 1000; // 10 minutes
const SLEEP_BETWEEN_KEYWORDS_MS = 8000; // 8 seconds
const STATE_FILE = path.join(process.cwd(), 'data', 'linkedin_state.json');

// ============================================================================
//                         KEYWORD CONFIGURATION
// ============================================================================

export interface KeywordConfig {
    keyword: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
    lastScraped?: string;
    totalJobsFound: number;
    lastJobsFound: number;
}

// Failed Job Queue Item
interface FailedJob {
    jobId: string;
    partialJob: any;
    failedAt: string;
    retryCount: number;
    lastError: string;
}

// Professional Keyword Strategy - Categorized with Priority
export const KEYWORD_DATABASE: KeywordConfig[] = [
    // Core Broad (HIGH PRIORITY - Most Coverage)
    { keyword: 'Jobs', priority: 'high', category: 'Core', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Hiring', priority: 'high', category: 'Core', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Vacancies', priority: 'high', category: 'Core', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Careers', priority: 'medium', category: 'Core', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Opportunities', priority: 'medium', category: 'Core', totalJobsFound: 0, lastJobsFound: 0 },

    // Tech & Engineering (HIGH - Hot Market)
    { keyword: 'Software Engineer', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Frontend', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Backend', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Full Stack', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'DevOps', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Web Developer', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Mobile Developer', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'QA', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Testing', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'IT Support', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Cyber Security', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Cloud', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'System Administrator', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Network Engineer', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },

    // Data & AI (HIGH - Growing Fast)
    { keyword: 'Data', priority: 'high', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Data Analyst', priority: 'high', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Data Scientist', priority: 'high', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'AI', priority: 'medium', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Machine Learning', priority: 'medium', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Business Intelligence', priority: 'medium', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'BI', priority: 'low', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Analytics', priority: 'medium', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },

    // Business & Sales (HIGH - Always Hiring)
    { keyword: 'Sales', priority: 'high', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Sales Executive', priority: 'medium', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Sales Manager', priority: 'medium', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Business Development', priority: 'high', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Account Manager', priority: 'medium', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Customer Success', priority: 'low', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'CRM', priority: 'low', category: 'Sales', totalJobsFound: 0, lastJobsFound: 0 },

    // Marketing (MEDIUM)
    { keyword: 'Marketing', priority: 'high', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Digital Marketing', priority: 'high', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Performance Marketing', priority: 'medium', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Growth', priority: 'medium', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Brand Manager', priority: 'low', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Product Marketing', priority: 'low', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Content', priority: 'medium', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Social Media', priority: 'medium', category: 'Marketing', totalJobsFound: 0, lastJobsFound: 0 },

    // Management (MEDIUM)
    { keyword: 'Product Manager', priority: 'high', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Project Manager', priority: 'high', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Operations Manager', priority: 'medium', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },

    // HR & Admin (MEDIUM)
    { keyword: 'HR', priority: 'high', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Human Resources', priority: 'medium', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Recruiter', priority: 'medium', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Talent Acquisition', priority: 'medium', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'People Operations', priority: 'low', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Admin', priority: 'medium', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Office Manager', priority: 'low', category: 'HR', totalJobsFound: 0, lastJobsFound: 0 },

    // Finance & Accounting (MEDIUM)
    { keyword: 'Finance', priority: 'high', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Financial Analyst', priority: 'medium', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Accountant', priority: 'high', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Accounting', priority: 'medium', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Auditor', priority: 'medium', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Tax', priority: 'low', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Treasury', priority: 'low', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Payroll', priority: 'low', category: 'Finance', totalJobsFound: 0, lastJobsFound: 0 },

    // Operations & Supply Chain (MEDIUM)
    { keyword: 'Operations', priority: 'high', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Supply Chain', priority: 'high', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Logistics', priority: 'high', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Procurement', priority: 'medium', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Purchasing', priority: 'low', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Warehouse', priority: 'medium', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Inventory', priority: 'low', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Planning', priority: 'low', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },

    // Quality (LOW)
    { keyword: 'Quality', priority: 'medium', category: 'Quality', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Quality Assurance', priority: 'low', category: 'Quality', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Quality Control', priority: 'low', category: 'Quality', totalJobsFound: 0, lastJobsFound: 0 },

    // Engineering (Non-Software)
    { keyword: 'Civil Engineer', priority: 'medium', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Mechanical Engineer', priority: 'medium', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Electrical Engineer', priority: 'medium', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Industrial Engineer', priority: 'low', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Architect', priority: 'medium', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Construction', priority: 'medium', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Site Engineer', priority: 'low', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },

    // Medical & Healthcare
    { keyword: 'Medical', priority: 'high', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Doctor', priority: 'medium', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Nurse', priority: 'medium', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Pharmacist', priority: 'medium', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Healthcare', priority: 'medium', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Medical Representative', priority: 'medium', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Clinical', priority: 'low', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Lab', priority: 'low', category: 'Medical', totalJobsFound: 0, lastJobsFound: 0 },

    // Education
    { keyword: 'Teacher', priority: 'medium', category: 'Education', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Instructor', priority: 'low', category: 'Education', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Trainer', priority: 'medium', category: 'Education', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Education', priority: 'medium', category: 'Education', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Lecturer', priority: 'low', category: 'Education', totalJobsFound: 0, lastJobsFound: 0 },

    // Creative & Design
    { keyword: 'Design', priority: 'medium', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Graphic Designer', priority: 'medium', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'UI UX', priority: 'high', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Product Designer', priority: 'medium', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Motion Designer', priority: 'low', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Video Editor', priority: 'low', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Creative', priority: 'low', category: 'Design', totalJobsFound: 0, lastJobsFound: 0 },

    // Legal
    { keyword: 'Legal', priority: 'medium', category: 'Legal', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Lawyer', priority: 'medium', category: 'Legal', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Compliance', priority: 'medium', category: 'Legal', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Contracts', priority: 'low', category: 'Legal', totalJobsFound: 0, lastJobsFound: 0 },

    // Customer Support & Languages
    { keyword: 'Customer Service', priority: 'high', category: 'Support', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Call Center', priority: 'high', category: 'Support', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Support', priority: 'medium', category: 'Support', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Technical Support', priority: 'medium', category: 'Support', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'French', priority: 'medium', category: 'Languages', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'German', priority: 'medium', category: 'Languages', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Spanish', priority: 'low', category: 'Languages', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Bilingual', priority: 'low', category: 'Languages', totalJobsFound: 0, lastJobsFound: 0 },

    // Real Estate & Facilities
    { keyword: 'Real Estate', priority: 'medium', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Property', priority: 'low', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Broker', priority: 'low', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Leasing', priority: 'low', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Facilities', priority: 'low', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Maintenance', priority: 'low', category: 'RealEstate', totalJobsFound: 0, lastJobsFound: 0 },

    // Industries
    { keyword: 'Banking', priority: 'high', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Fintech', priority: 'high', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'E-commerce', priority: 'high', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Retail', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'FMCG', priority: 'high', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Manufacturing', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Oil and Gas', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Energy', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Telecom', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Hospitality', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Tourism', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Travel', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Aviation', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Startup', priority: 'high', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },

    // 🆕 EXPANDED KEYWORDS - More Coverage
    // Remote & Flexibility
    { keyword: 'Remote', priority: 'high', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Work From Home', priority: 'high', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Hybrid', priority: 'medium', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Part Time', priority: 'medium', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Freelance', priority: 'medium', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Internship', priority: 'high', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Fresh Graduate', priority: 'high', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Entry Level', priority: 'high', category: 'WorkType', totalJobsFound: 0, lastJobsFound: 0 },

    // More Tech Keywords
    { keyword: 'Python', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Java', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'JavaScript', priority: 'high', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'React', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Angular', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Node.js', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'PHP', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Laravel', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: '.NET', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'AWS', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Azure', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'SQL', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Database', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Android', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'iOS', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Flutter', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Scrum', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Agile', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'ERP', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'SAP', priority: 'medium', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Oracle', priority: 'low', category: 'Tech', totalJobsFound: 0, lastJobsFound: 0 },

    // More Business
    { keyword: 'Manager', priority: 'high', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Director', priority: 'medium', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Executive', priority: 'medium', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Supervisor', priority: 'medium', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Team Leader', priority: 'medium', category: 'Management', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Coordinator', priority: 'medium', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Specialist', priority: 'medium', category: 'Operations', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Analyst', priority: 'high', category: 'Data', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Consultant', priority: 'medium', category: 'Consulting', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Engineer', priority: 'high', category: 'Engineering', totalJobsFound: 0, lastJobsFound: 0 },

    // More Industries
    { keyword: 'Insurance', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Pharmaceutical', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Automotive', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Food', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Beverage', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Media', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Advertising', priority: 'medium', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'NGO', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Government', priority: 'low', category: 'Industry', totalJobsFound: 0, lastJobsFound: 0 },

    // Egypt-Specific & Arabic
    { keyword: 'Cairo', priority: 'high', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Alexandria', priority: 'medium', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Giza', priority: 'medium', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'New Cairo', priority: 'medium', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Smart Village', priority: 'medium', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Maadi', priority: 'low', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'Nasr City', priority: 'low', category: 'Location', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'وظائف', priority: 'high', category: 'Arabic', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'مطلوب', priority: 'high', category: 'Arabic', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'توظيف', priority: 'medium', category: 'Arabic', totalJobsFound: 0, lastJobsFound: 0 },
    { keyword: 'فرص عمل', priority: 'medium', category: 'Arabic', totalJobsFound: 0, lastJobsFound: 0 },
];

// ============================================================================
//                         STATE MANAGEMENT
// ============================================================================

interface ScraperState {
    lastFullCycle: string;
    totalJobsScraped: number;
    cycleCount: number;
    keywordStats: { [keyword: string]: { total: number; last: number; lastScraped: string } };
    failedJobs: FailedJob[]; // NEW: Track failed jobs for retry
}

function loadState(): ScraperState {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
            // Ensure failedJobs array exists
            if (!state.failedJobs) state.failedJobs = [];
            return state;
        }
    } catch (e) { }
    return {
        lastFullCycle: new Date().toISOString(),
        totalJobsScraped: 0,
        cycleCount: 0,
        keywordStats: {},
        failedJobs: []
    };
}

function saveState(state: ScraperState) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
        console.error('[State] Failed to save:', e);
    }
}

// ============================================================================
//                         SMART SCHEDULER
// ============================================================================

class SmartKeywordScheduler {
    private keywords: KeywordConfig[];
    private state: ScraperState;

    constructor(keywords: KeywordConfig[], state: ScraperState) {
        this.keywords = keywords;
        this.state = state;
        this.loadStatsFromState();
    }

    private loadStatsFromState() {
        for (const kw of this.keywords) {
            const stats = this.state.keywordStats[kw.keyword];
            if (stats) {
                kw.totalJobsFound = stats.total;
                kw.lastJobsFound = stats.last;
                kw.lastScraped = stats.lastScraped;
            }
        }
    }

    // Priority Queue: Sort keywords by priority and performance
    getOptimizedKeywordOrder(): KeywordConfig[] {
        const now = new Date();
        const hourOfDay = now.getHours();

        // Clone and sort
        return [...this.keywords].sort((a, b) => {
            // 1. Priority first
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;

            // 2. Keywords that found more jobs recently get priority
            const perfDiff = (b.lastJobsFound || 0) - (a.lastJobsFound || 0);
            if (perfDiff !== 0) return perfDiff;

            // 3. Keywords not scraped recently get priority
            const aLast = a.lastScraped ? new Date(a.lastScraped).getTime() : 0;
            const bLast = b.lastScraped ? new Date(b.lastScraped).getTime() : 0;
            return aLast - bLast;
        });
    }

    // Get keywords for current time of day (Restored with user's new minimum 145 requirement)
    getKeywordsForCurrentSession(): KeywordConfig[] {
        const ordered = this.getOptimizedKeywordOrder();
        const hour = new Date().getHours();

        // Morning (6-12): Minimum 145 keywords (High + Medium + Top Low)
        // Afternoon (12-18): Around 165 keywords
        // Night (18-6): All 189 keywords

        if (hour >= 6 && hour < 12) {
            const highAndMed = ordered.filter(k => k.priority !== 'low' || k.lastJobsFound > 5);
            const lowPriority = ordered.filter(k => k.priority === 'low' && k.lastJobsFound <= 5);
            // Guarantee at least 145
            const needed = Math.max(0, 145 - highAndMed.length);
            return [...highAndMed, ...lowPriority.slice(0, needed)];
        } else if (hour >= 12 && hour < 18) {
            const highAndMed = ordered.filter(k => k.priority !== 'low');
            const lowPriority = ordered.filter(k => k.priority === 'low');
            // Guarantee at least 165
            const needed = Math.max(0, 165 - highAndMed.length);
            return [...highAndMed, ...lowPriority.slice(0, needed)];
        } else {
            // Night: Full coverage (189)
            return ordered;
        }
    }

    updateKeywordStats(keyword: string, jobsFound: number) {
        const kw = this.keywords.find(k => k.keyword === keyword);
        if (kw) {
            kw.lastJobsFound = jobsFound;
            kw.totalJobsFound += jobsFound;
            kw.lastScraped = new Date().toISOString();

            this.state.keywordStats[keyword] = {
                total: kw.totalJobsFound,
                last: kw.lastJobsFound,
                lastScraped: kw.lastScraped
            };
        }
    }

    getStats(): { total: number; high: number; medium: number; low: number } {
        return {
            total: this.keywords.length,
            high: this.keywords.filter(k => k.priority === 'high').length,
            medium: this.keywords.filter(k => k.priority === 'medium').length,
            low: this.keywords.filter(k => k.priority === 'low').length
        };
    }
}

// ============================================================================
//                         FAILED JOB MANAGER
// ============================================================================

class FailedJobManager {
    private state: ScraperState;
    private readonly MAX_RETRIES = 5;

    constructor(state: ScraperState) {
        this.state = state;
    }

    addFailedJob(jobId: string, partialJob: any, error: string): void {
        // Check if already in failed queue
        const existing = this.state.failedJobs.find(j => j.jobId === jobId);
        if (existing) {
            existing.retryCount++;
            existing.lastError = error;
            existing.failedAt = new Date().toISOString();
        } else {
            this.state.failedJobs.push({
                jobId,
                partialJob,
                failedAt: new Date().toISOString(),
                retryCount: 1,
                lastError: error
            });
        }
    }

    removeJob(jobId: string): void {
        this.state.failedJobs = this.state.failedJobs.filter(j => j.jobId !== jobId);
    }

    getJobsToRetry(): FailedJob[] {
        // Get jobs that haven't exceeded max retries
        return this.state.failedJobs.filter(j => j.retryCount < this.MAX_RETRIES);
    }

    getQueueSize(): number {
        return this.state.failedJobs.length;
    }

    cleanupOldFailures(): void {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.state.failedJobs = this.state.failedJobs.filter(j => {
            const failedTime = new Date(j.failedAt).getTime();
            return failedTime > oneDayAgo || j.retryCount < this.MAX_RETRIES;
        });
    }
}

// ============================================================================
//                           MAIN MANAGER
// ============================================================================
import { askResumeOrRestart } from './utils/promptResume';

async function main() {
    await askResumeOrRestart('LinkedIn');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🔥 ENTERPRISE LINKEDIN MANAGER v3.0 🔥                 ║');
    console.log('║     Features: Network Health | Retry Queue | Keep Awake   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // 🔥 NEW: Start Keep Awake to prevent system sleep
    keepAwake.start();
    console.log('[System] 💡 Keep Awake activated - system won\'t sleep');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n[System] Shutting down gracefully...');
        keepAwake.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n[System] Shutting down gracefully...');
        keepAwake.stop();
        process.exit(0);
    });

    // 1. Setup
    const scraper = new LinkedInBrowserScraper();
    const csvPath = path.join(__dirname, '../data/linkedin_clean_data.csv');
    const collector = new JobCollector(scraper, csvPath);

    // 2. Load State
    let state = loadState();
    const scheduler = new SmartKeywordScheduler(KEYWORD_DATABASE, state);
    const failedJobManager = new FailedJobManager(state);

    const stats = scheduler.getStats();
    console.log(`\n📊 Keyword Database Loaded:`);
    console.log(`   Total: ${stats.total} | High: ${stats.high} | Medium: ${stats.medium} | Low: ${stats.low}`);
    console.log(`   Previous cycles: ${state.cycleCount} | Total jobs scraped: ${state.totalJobsScraped}`);
    console.log(`   Failed jobs in queue: ${failedJobManager.getQueueSize()}`);

    // 🔥 NEW: Check network before starting
    console.log('\n[Network] Checking internet connection...');
    await networkHealth.waitForNetwork();
    console.log('[Network] ✅ Connection verified\n');

    // INFINITE LOOP
    while (true) {
        state.cycleCount++;
        const cycleStart = new Date();

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`   🔄 STARTING CYCLE #${state.cycleCount}`);
        console.log(`   ⏰ Started at: ${cycleStart.toLocaleTimeString()}`);
        console.log(`${'═'.repeat(60)}\n`);

        try {
            // Load Known IDs fresh
            const knownIds = collector.getKnownIds();
            console.log(`[Manager] 🛡️ Knowledge Base: ${knownIds.size} unique Job IDs`);

            const sessionKeywords = scheduler.getKeywordsForCurrentSession();
            console.log(`[Manager] 📅 Session Keywords: ${sessionKeywords.length} (based on time of day)\n`);

            const { StateTracker } = require('./utils/StateTracker');
            const stateTracker = new StateTracker('linkedin_v1');
            const lastKeyword = stateTracker.getLastProgress('global_scan_v1') || 0; // we will use lastPage as index here for V1

            let totalNewJobs = 0;
            let totalSaved = 0;
            let keywordsProcessed = 0;

            for (let i = 0; i < sessionKeywords.length; i++) {
                if (i < lastKeyword) {
                    console.log(`   ⏭️ Skipping "${sessionKeywords[i].keyword}" (Already completed in previous interrupted session)`);
                    continue;
                }
                
                // Save state pointer so if it crashes, it resumes here
                stateTracker.updateKeywordProgress('global_scan_v1', i);
                
                const kwConfig = sessionKeywords[i];
                const keyword = kwConfig.keyword;
                keywordsProcessed++;

                console.log(`\n[${keywordsProcessed}/${sessionKeywords.length}] 🔍 "${keyword}" [${kwConfig.priority.toUpperCase()}] [${kwConfig.category}]`);

                try {
                    // 🔥 NEW: Check network before discovery
                    await networkHealth.waitForNetwork();

                    // Discover with network retry
                    const discovered = await networkHealth.executeWithRetry(
                        () => scraper.discoverJobs(keyword),
                        3,
                        `Discover "${keyword}"`
                    );

                    if (!discovered) {
                        console.log(`   ⚠️ Discovery failed after retries, moving on...`);
                        continue;
                    }

                    console.log(`   Found ${discovered.length} raw jobs`);

                    // Deduplicate
                    const newJobs = discovered.filter(j => !knownIds.has(j.source_job_id));
                    console.log(`   ✨ New: ${newJobs.length} | Skipped: ${discovered.length - newJobs.length}`);

                    // Update stats
                    scheduler.updateKeywordStats(keyword, newJobs.length);

                    if (newJobs.length === 0) {
                        console.log(`   ⏭️ No new jobs, moving on...`);
                    } else {
                        totalNewJobs += newJobs.length;
                        let savedCount = 0;

                        for (const partialJob of newJobs) {
                            if (knownIds.has(partialJob.source_job_id)) continue;

                            // 🔥 NEW: Check network before each job detail
                            await networkHealth.waitForNetwork();

                            // Try to scrape with retry
                            const detailed = await networkHealth.executeWithRetry(
                                () => scraper.scrapeJobDetail(partialJob.source_job_id, partialJob),
                                3,
                                `Detail Job ${partialJob.source_job_id}`
                            );

                            if (detailed) {
                                try {
                                    // @ts-ignore
                                    collector.saveJobs([detailed]);
                                    knownIds.add(detailed.job_id || partialJob.source_job_id);
                                    savedCount++;
                                    totalSaved++;
                                    state.totalJobsScraped++;

                                    // Remove from failed queue if it was there
                                    failedJobManager.removeJob(partialJob.source_job_id);
                                } catch (e) {
                                    console.error(`   ❌ Save failed: ${detailed.job_id}`);
                                }
                            } else {
                                // 🔥 NEW: Add to failed queue for later retry
                                failedJobManager.addFailedJob(
                                    partialJob.source_job_id,
                                    partialJob,
                                    'Network error during detail scrape'
                                );
                                console.log(`   📥 Added to retry queue: ${partialJob.source_job_id}`);
                            }

                            // Random delay (2-5 seconds)
                            await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
                        }

                        console.log(`   💾 Saved: ${savedCount}/${newJobs.length}`);
                    }

                    // Save state periodically
                    saveState(state);

                    // Sleep between keywords
                    console.log(`   😴 Cooling down ${SLEEP_BETWEEN_KEYWORDS_MS / 1000}s...`);
                    await new Promise(r => setTimeout(r, SLEEP_BETWEEN_KEYWORDS_MS));

                } catch (keywordError: any) {
                    if (NetworkHealthCheck.isNetworkError(keywordError)) {
                        console.log(`   ⚠️ Network error, waiting for recovery...`);
                        await networkHealth.waitForNetwork();
                        // Don't skip - retry this keyword
                        keywordsProcessed--;
                        continue;
                    }
                    console.error(`   ⚠️ Error: ${keywordError}`);
                    console.log(`   Continuing to next keyword...`);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            // 🔥 NEW: Process Failed Job Queue
            const failedToRetry = failedJobManager.getJobsToRetry();
            if (failedToRetry.length > 0) {
                console.log(`\n${'─'.repeat(60)}`);
                console.log(`   📥 RETRYING ${failedToRetry.length} FAILED JOBS`);
                console.log(`${'─'.repeat(60)}`);

                let retriedCount = 0;
                let successCount = 0;

                for (const failedJob of failedToRetry) {
                    retriedCount++;
                    console.log(`\n   [Retry ${retriedCount}/${failedToRetry.length}] Job: ${failedJob.jobId} (Attempt ${failedJob.retryCount + 1})`);

                    await networkHealth.waitForNetwork();

                    const detailed = await networkHealth.executeWithRetry(
                        () => scraper.scrapeJobDetail(failedJob.jobId, failedJob.partialJob),
                        2,
                        `Retry Job ${failedJob.jobId}`
                    );

                    if (detailed) {
                        try {
                            // @ts-ignore
                            collector.saveJobs([detailed]);
                            failedJobManager.removeJob(failedJob.jobId);
                            successCount++;
                            state.totalJobsScraped++;
                            totalSaved++;
                            console.log(`   ✅ Successfully scraped and saved!`);
                        } catch (e) {
                            console.log(`   ❌ Save failed`);
                        }
                    } else {
                        failedJobManager.addFailedJob(failedJob.jobId, failedJob.partialJob, 'Retry failed');
                        console.log(`   ❌ Still failing, will retry later`);
                    }

                    await new Promise(r => setTimeout(r, 3000));
                }

                console.log(`\n   📊 Retry Summary: ${successCount}/${retriedCount} succeeded`);

                // Cleanup old failures
                failedJobManager.cleanupOldFailures();
                saveState(state);
            }

            // Cycle Summary
            const cycleEnd = new Date();
            const cycleDuration = Math.round((cycleEnd.getTime() - cycleStart.getTime()) / 1000 / 60);

            console.log(`\n${'═'.repeat(60)}`);
            console.log(`   ✅ CYCLE #${state.cycleCount} COMPLETE`);
            console.log(`   ⏱️ Duration: ${cycleDuration} minutes`);
            console.log(`   📊 New Jobs Found: ${totalNewJobs}`);
            console.log(`   💾 Jobs Saved: ${totalSaved}`);
            console.log(`   📈 Total (All Time): ${state.totalJobsScraped}`);
            console.log(`   📥 Failed Queue: ${failedJobManager.getQueueSize()} jobs pending`);
            console.log(`${'═'.repeat(60)}`);

            state.lastFullCycle = cycleEnd.toISOString();
            saveState(state);
            stateTracker.clearCompleted(); // Reset pause/resume pointer for next cycle

        } catch (cycleError) {
            console.error('[Manager] 💥 Critical Cycle Error:', cycleError);
            console.log('[Manager] Will retry after sleep...');
        }

        // Sleep before next cycle
        const nextCycleTime = new Date(Date.now() + SLEEP_BETWEEN_CYCLES_MS);
        console.log(`\n[Manager] 💤 Sleeping ${SLEEP_BETWEEN_CYCLES_MS / 1000 / 60} minutes...`);
        console.log(`[Manager] Next cycle: ${nextCycleTime.toLocaleTimeString()}`);
        await new Promise(r => setTimeout(r, SLEEP_BETWEEN_CYCLES_MS));
    }
}

// ============================================================================
//                           ENTRY POINT
// ============================================================================

if (require.main === module) {
    main().catch(e => {
        console.error('[Manager] FATAL ERROR:', e);
        keepAwake.stop();
        console.log('[Manager] Restarting in 60 seconds...');
        setTimeout(() => main(), 60000);
    });
}
