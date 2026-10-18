export type ScrapeMode = 'incremental' | 'backfill';

export interface KeywordConfig {
    keyword: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
}

export interface QuerySpec {
    keyword: string;
    city: string;
    mode: ScrapeMode;
    days: number;
    priority: 'high' | 'medium' | 'low';
    category: string;
    queryKey: string;
}

const DEFAULT_INCREMENTAL_DAYS = 7;
const DEFAULT_BACKFILL_DAYS = 90;

const KEYWORDS: KeywordConfig[] = [
    { keyword: 'Jobs', priority: 'high', category: 'Core' },
    { keyword: 'Hiring', priority: 'high', category: 'Core' },
    { keyword: 'Vacancies', priority: 'high', category: 'Core' },
    { keyword: 'Careers', priority: 'medium', category: 'Core' },
    { keyword: 'Openings', priority: 'medium', category: 'Core' },
    { keyword: 'Job Openings', priority: 'medium', category: 'Core' },
    { keyword: 'Open Positions', priority: 'medium', category: 'Core' },
    { keyword: 'Employment', priority: 'low', category: 'Core' },

    { keyword: 'Software Engineer', priority: 'high', category: 'Tech' },
    { keyword: 'Software Developer', priority: 'high', category: 'Tech' },
    { keyword: 'Backend', priority: 'high', category: 'Tech' },
    { keyword: 'Frontend', priority: 'high', category: 'Tech' },
    { keyword: 'Full Stack', priority: 'high', category: 'Tech' },
    { keyword: 'Web Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'Mobile Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'Android Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'iOS Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'React', priority: 'medium', category: 'Tech' },
    { keyword: 'Node.js', priority: 'medium', category: 'Tech' },
    { keyword: 'Python Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'Java Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'C# Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'PHP Developer', priority: 'medium', category: 'Tech' },
    { keyword: 'DevOps', priority: 'medium', category: 'Tech' },
    { keyword: 'SRE', priority: 'low', category: 'Tech' },
    { keyword: 'Cloud Engineer', priority: 'medium', category: 'Tech' },
    { keyword: 'Cybersecurity', priority: 'medium', category: 'Tech' },
    { keyword: 'Network Engineer', priority: 'medium', category: 'Tech' },
    { keyword: 'System Administrator', priority: 'medium', category: 'Tech' },
    { keyword: 'IT Support', priority: 'medium', category: 'Tech' },
    { keyword: 'IT Helpdesk', priority: 'low', category: 'Tech' },
    { keyword: 'QA', priority: 'medium', category: 'Tech' },
    { keyword: 'QA Engineer', priority: 'medium', category: 'Tech' },
    { keyword: 'Machine Learning Engineer', priority: 'medium', category: 'Tech' },
    { keyword: 'AI Engineer', priority: 'low', category: 'Tech' },

    { keyword: 'Data Analyst', priority: 'high', category: 'Data' },
    { keyword: 'Data Scientist', priority: 'high', category: 'Data' },
    { keyword: 'Data Engineer', priority: 'high', category: 'Data' },
    { keyword: 'Business Analyst', priority: 'medium', category: 'Data' },
    { keyword: 'BI Analyst', priority: 'medium', category: 'Data' },
    { keyword: 'Analytics', priority: 'medium', category: 'Data' },
    { keyword: 'Business Intelligence', priority: 'medium', category: 'Data' },
    { keyword: 'Power BI', priority: 'medium', category: 'Data' },
    { keyword: 'Tableau', priority: 'low', category: 'Data' },
    { keyword: 'SQL', priority: 'low', category: 'Data' },

    { keyword: 'Product Manager', priority: 'high', category: 'Product' },
    { keyword: 'Product Owner', priority: 'medium', category: 'Product' },
    { keyword: 'Project Manager', priority: 'medium', category: 'Product' },
    { keyword: 'Scrum Master', priority: 'low', category: 'Product' },

    { keyword: 'Sales', priority: 'high', category: 'Business' },
    { keyword: 'Business Development', priority: 'high', category: 'Business' },
    { keyword: 'Account Manager', priority: 'medium', category: 'Business' },
    { keyword: 'Account Executive', priority: 'medium', category: 'Business' },
    { keyword: 'Sales Representative', priority: 'medium', category: 'Business' },
    { keyword: 'Sales Manager', priority: 'medium', category: 'Business' },
    { keyword: 'Customer Success', priority: 'medium', category: 'Business' },
    { keyword: 'Key Account Manager', priority: 'low', category: 'Business' },

    { keyword: 'Marketing', priority: 'high', category: 'Marketing' },
    { keyword: 'Digital Marketing', priority: 'high', category: 'Marketing' },
    { keyword: 'Growth', priority: 'medium', category: 'Marketing' },
    { keyword: 'Performance Marketing', priority: 'medium', category: 'Marketing' },
    { keyword: 'Social Media', priority: 'medium', category: 'Marketing' },
    { keyword: 'Content Marketing', priority: 'medium', category: 'Marketing' },
    { keyword: 'SEO', priority: 'medium', category: 'Marketing' },
    { keyword: 'SEM', priority: 'low', category: 'Marketing' },
    { keyword: 'Brand Manager', priority: 'low', category: 'Marketing' },
    { keyword: 'PR', priority: 'low', category: 'Marketing' },

    { keyword: 'HR', priority: 'high', category: 'HR' },
    { keyword: 'Recruiter', priority: 'medium', category: 'HR' },
    { keyword: 'Office Manager', priority: 'low', category: 'HR' },
    { keyword: 'Talent Acquisition', priority: 'medium', category: 'HR' },
    { keyword: 'HR Generalist', priority: 'medium', category: 'HR' },
    { keyword: 'HR Manager', priority: 'medium', category: 'HR' },
    { keyword: 'People Operations', priority: 'low', category: 'HR' },

    { keyword: 'Accountant', priority: 'high', category: 'Finance' },
    { keyword: 'Accounting', priority: 'high', category: 'Finance' },
    { keyword: 'Financial Analyst', priority: 'medium', category: 'Finance' },
    { keyword: 'Payroll', priority: 'low', category: 'Finance' },
    { keyword: 'Finance Manager', priority: 'medium', category: 'Finance' },
    { keyword: 'Auditor', priority: 'medium', category: 'Finance' },
    { keyword: 'Accounts Payable', priority: 'low', category: 'Finance' },
    { keyword: 'Accounts Receivable', priority: 'low', category: 'Finance' },
    { keyword: 'Tax', priority: 'low', category: 'Finance' },
    { keyword: 'Treasury', priority: 'low', category: 'Finance' },

    { keyword: 'Operations', priority: 'high', category: 'Operations' },
    { keyword: 'Operations Manager', priority: 'medium', category: 'Operations' },
    { keyword: 'Supply Chain', priority: 'high', category: 'Operations' },
    { keyword: 'Logistics', priority: 'high', category: 'Operations' },
    { keyword: 'Procurement', priority: 'medium', category: 'Operations' },
    { keyword: 'Logistics Coordinator', priority: 'medium', category: 'Operations' },
    { keyword: 'Warehouse', priority: 'medium', category: 'Operations' },
    { keyword: 'Inventory', priority: 'low', category: 'Operations' },
    { keyword: 'Production', priority: 'low', category: 'Operations' },
    { keyword: 'Quality', priority: 'low', category: 'Operations' },
    { keyword: 'Driver', priority: 'low', category: 'Operations' },
    { keyword: 'Delivery', priority: 'low', category: 'Operations' },

    { keyword: 'Civil Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Mechanical Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Electrical Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Architect', priority: 'medium', category: 'Engineering' },
    { keyword: 'Site Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Project Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'QA/QC Engineer', priority: 'low', category: 'Engineering' },
    { keyword: 'MEP Engineer', priority: 'low', category: 'Engineering' },

    { keyword: 'Doctor', priority: 'medium', category: 'Medical' },
    { keyword: 'Nurse', priority: 'medium', category: 'Medical' },
    { keyword: 'Pharmacist', priority: 'medium', category: 'Medical' },
    { keyword: 'Dentist', priority: 'medium', category: 'Medical' },
    { keyword: 'Medical Representative', priority: 'medium', category: 'Medical' },
    { keyword: 'Lab Technician', priority: 'medium', category: 'Medical' },
    { keyword: 'Radiology', priority: 'low', category: 'Medical' },
    { keyword: 'Healthcare', priority: 'low', category: 'Medical' },

    { keyword: 'Teacher', priority: 'medium', category: 'Education' },
    { keyword: 'Instructor', priority: 'low', category: 'Education' },
    { keyword: 'Tutor', priority: 'low', category: 'Education' },
    { keyword: 'Lecturer', priority: 'low', category: 'Education' },
    { keyword: 'English Teacher', priority: 'medium', category: 'Education' },
    { keyword: 'Math Teacher', priority: 'low', category: 'Education' },
    { keyword: 'Science Teacher', priority: 'low', category: 'Education' },
    { keyword: 'Arabic Teacher', priority: 'low', category: 'Education' },

    { keyword: 'UI UX', priority: 'high', category: 'Design' },
    { keyword: 'UI/UX Designer', priority: 'medium', category: 'Design' },
    { keyword: 'Graphic Designer', priority: 'medium', category: 'Design' },
    { keyword: 'Product Designer', priority: 'medium', category: 'Design' },
    { keyword: 'Motion Designer', priority: 'low', category: 'Design' },
    { keyword: 'Interior Designer', priority: 'low', category: 'Design' },
    { keyword: 'Video Editor', priority: 'low', category: 'Design' },

    { keyword: 'Legal', priority: 'medium', category: 'Legal' },
    { keyword: 'Compliance', priority: 'medium', category: 'Legal' },
    { keyword: 'Lawyer', priority: 'medium', category: 'Legal' },
    { keyword: 'Legal Counsel', priority: 'low', category: 'Legal' },
    { keyword: 'Paralegal', priority: 'low', category: 'Legal' },
    { keyword: 'Compliance Officer', priority: 'low', category: 'Legal' },

    { keyword: 'Customer Service', priority: 'high', category: 'Support' },
    { keyword: 'Customer Support', priority: 'high', category: 'Support' },
    { keyword: 'Call Center', priority: 'high', category: 'Support' },
    { keyword: 'Technical Support', priority: 'medium', category: 'Support' },
    { keyword: 'Helpdesk', priority: 'medium', category: 'Support' },
    { keyword: 'Support Engineer', priority: 'low', category: 'Support' },

    { keyword: 'Admin', priority: 'medium', category: 'Admin' },
    { keyword: 'Administrative Assistant', priority: 'medium', category: 'Admin' },
    { keyword: 'Executive Assistant', priority: 'medium', category: 'Admin' },
    { keyword: 'Receptionist', priority: 'low', category: 'Admin' },
    { keyword: 'Secretary', priority: 'low', category: 'Admin' },
    { keyword: 'Office Administrator', priority: 'low', category: 'Admin' },
    { keyword: 'Data Entry', priority: 'medium', category: 'Admin' },

    { keyword: 'Hospitality', priority: 'low', category: 'Hospitality' },
    { keyword: 'Hotel', priority: 'low', category: 'Hospitality' },
    { keyword: 'Front Desk', priority: 'low', category: 'Hospitality' },
    { keyword: 'Waiter', priority: 'low', category: 'Hospitality' },
    { keyword: 'Chef', priority: 'low', category: 'Hospitality' },
    { keyword: 'Cook', priority: 'low', category: 'Hospitality' },
    { keyword: 'Housekeeping', priority: 'low', category: 'Hospitality' },

    { keyword: 'Retail', priority: 'low', category: 'Retail' },
    { keyword: 'Cashier', priority: 'low', category: 'Retail' },
    { keyword: 'Store Manager', priority: 'low', category: 'Retail' },
    { keyword: 'Merchandiser', priority: 'low', category: 'Retail' },

    { keyword: 'Real Estate', priority: 'medium', category: 'Real Estate' },
    { keyword: 'Property', priority: 'low', category: 'Real Estate' },
    { keyword: 'Broker', priority: 'low', category: 'Real Estate' },

    { keyword: 'Security', priority: 'low', category: 'Security' },
    { keyword: 'Security Guard', priority: 'low', category: 'Security' },
    { keyword: 'Safety Officer', priority: 'low', category: 'Security' },
    { keyword: 'HSE', priority: 'low', category: 'Security' },
    { keyword: 'Health and Safety', priority: 'low', category: 'Security' },

    { keyword: 'Banking', priority: 'medium', category: 'Banking' },
    { keyword: 'Bank Teller', priority: 'low', category: 'Banking' },
    { keyword: 'Credit Analyst', priority: 'medium', category: 'Banking' },
    { keyword: 'Risk Analyst', priority: 'medium', category: 'Banking' },
    { keyword: 'Insurance', priority: 'low', category: 'Insurance' },
    { keyword: 'Claims', priority: 'low', category: 'Insurance' },

    { keyword: 'Construction', priority: 'medium', category: 'Construction' },
    { keyword: 'Construction Manager', priority: 'medium', category: 'Construction' },
    { keyword: 'Quantity Surveyor', priority: 'medium', category: 'Construction' },

    { keyword: 'Manufacturing', priority: 'medium', category: 'Manufacturing' },
    { keyword: 'Production Manager', priority: 'medium', category: 'Manufacturing' },
    { keyword: 'Factory Worker', priority: 'low', category: 'Manufacturing' },
    { keyword: 'Maintenance Technician', priority: 'medium', category: 'Manufacturing' },
    { keyword: 'Industrial Engineer', priority: 'medium', category: 'Manufacturing' },

    { keyword: 'Energy', priority: 'low', category: 'Energy' },
    { keyword: 'Renewable Energy', priority: 'low', category: 'Energy' },

    { keyword: 'Fleet Manager', priority: 'low', category: 'Transport' },
    { keyword: 'Dispatcher', priority: 'low', category: 'Transport' },

    { keyword: 'Agriculture', priority: 'low', category: 'Agriculture' },

    { keyword: 'Copywriter', priority: 'medium', category: 'Media' },
    { keyword: 'Content Writer', priority: 'medium', category: 'Media' },

    { keyword: 'E-commerce', priority: 'medium', category: 'Ecommerce' },

    { keyword: 'NGO', priority: 'low', category: 'Public' },
    { keyword: 'Government', priority: 'low', category: 'Public' },

    { keyword: 'French', priority: 'medium', category: 'Languages' },
    { keyword: 'German', priority: 'medium', category: 'Languages' },
    { keyword: 'Spanish', priority: 'low', category: 'Languages' },
    { keyword: 'Italian', priority: 'low', category: 'Languages' },
    { keyword: 'Russian', priority: 'low', category: 'Languages' },
    { keyword: 'English', priority: 'low', category: 'Languages' },

    { keyword: 'وظائف', priority: 'high', category: 'Arabic' },
    { keyword: 'مطلوب', priority: 'high', category: 'Arabic' },
    { keyword: 'توظيف', priority: 'medium', category: 'Arabic' },
    { keyword: 'فرص عمل', priority: 'medium', category: 'Arabic' },
    { keyword: 'شغل', priority: 'medium', category: 'Arabic' },
    { keyword: 'وظيفة', priority: 'medium', category: 'Arabic' },
    { keyword: 'مطلوب فورا', priority: 'low', category: 'Arabic' },
    { keyword: 'اعلان وظائف', priority: 'low', category: 'Arabic' },
    { keyword: 'موظفين', priority: 'low', category: 'Arabic' },

    // --- NEW EXPANDED KEYWORDS ---
    // Medical Specialists
    { keyword: 'Cardiologist', priority: 'medium', category: 'Medical' },
    { keyword: 'Dermatologist', priority: 'medium', category: 'Medical' },
    { keyword: 'Pediatrician', priority: 'medium', category: 'Medical' },
    { keyword: 'Surgeon', priority: 'medium', category: 'Medical' },
    { keyword: 'Physiotherapist', priority: 'medium', category: 'Medical' },
    { keyword: 'Radiologist', priority: 'low', category: 'Medical' },
    { keyword: 'Medical Secretary', priority: 'low', category: 'Medical' },

    // Specialized Engineering
    { keyword: 'Petroleum Engineer', priority: 'high', category: 'Engineering' },
    { keyword: 'Chemical Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Biomedical Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Technical Office Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Planning Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Production Engineer', priority: 'medium', category: 'Engineering' },
    { keyword: 'Maintenance Engineer', priority: 'medium', category: 'Engineering' },

    // Skilled Trades & Blue Collar
    { keyword: 'Electrician', priority: 'medium', category: 'Trades' },
    { keyword: 'Plumber', priority: 'medium', category: 'Trades' },
    { keyword: 'Welder', priority: 'medium', category: 'Trades' },
    { keyword: 'Mechanic', priority: 'medium', category: 'Trades' },
    { keyword: 'Carpenter', priority: 'low', category: 'Trades' },
    { keyword: 'Painter', priority: 'low', category: 'Trades' },
    { keyword: 'Technician', priority: 'high', category: 'Trades' },
    { keyword: 'CNC Operator', priority: 'low', category: 'Trades' },
    { keyword: 'Foreman', priority: 'low', category: 'Trades' },
    { keyword: 'Worker', priority: 'low', category: 'Trades' },
    { keyword: 'Laborer', priority: 'low', category: 'Trades' },

    // Arabic - High Volume
    { keyword: 'مندوب مبيعات', priority: 'high', category: 'Arabic' },
    { keyword: 'سائق', priority: 'high', category: 'Arabic' },
    { keyword: 'محاسب', priority: 'high', category: 'Arabic' },
    { keyword: 'مهندس', priority: 'high', category: 'Arabic' },
    { keyword: 'دكتور', priority: 'medium', category: 'Arabic' },
    { keyword: 'ممرضة', priority: 'medium', category: 'Arabic' },
    { keyword: 'صيدلي', priority: 'medium', category: 'Arabic' },
    { keyword: 'عامل', priority: 'high', category: 'Arabic' },
    { keyword: 'فني', priority: 'high', category: 'Arabic' },
    { keyword: 'سائق خاص', priority: 'medium', category: 'Arabic' },
    { keyword: 'أمن', priority: 'medium', category: 'Arabic' },
    { keyword: 'خدمة عملاء', priority: 'high', category: 'Arabic' },
    { keyword: 'سكرتارية', priority: 'medium', category: 'Arabic' },
    { keyword: 'مدخل بيانات', priority: 'medium', category: 'Arabic' },
    { keyword: 'شيف', priority: 'medium', category: 'Arabic' },
    { keyword: 'ويتر', priority: 'low', category: 'Arabic' },

    // General & Work Types
    { keyword: 'Fresh Graduate', priority: 'high', category: 'General' },
    { keyword: 'Internship', priority: 'high', category: 'General' },
    { keyword: 'Part time', priority: 'high', category: 'General' },
    { keyword: 'Work from home', priority: 'high', category: 'General' },
    { keyword: 'Remote', priority: 'high', category: 'General' },
    { keyword: 'Freelance', priority: 'medium', category: 'General' },

    // --- MERGED FROM LINKEDIN MANAGER ---
    // Management Roles
    { keyword: 'Director', priority: 'medium', category: 'Management' },
    { keyword: 'Executive', priority: 'medium', category: 'Management' },
    { keyword: 'Supervisor', priority: 'medium', category: 'Management' },
    { keyword: 'Team Leader', priority: 'medium', category: 'Management' },
    { keyword: 'Consultant', priority: 'medium', category: 'Consulting' },
    { keyword: 'Coordinator', priority: 'medium', category: 'Operations' },
    { keyword: 'Specialist', priority: 'medium', category: 'Operations' },

    // Tech Stack & Frameworks
    { keyword: 'Angular', priority: 'medium', category: 'Tech' },
    { keyword: 'Laravel', priority: 'low', category: 'Tech' },
    { keyword: '.NET', priority: 'medium', category: 'Tech' },
    { keyword: 'AWS', priority: 'medium', category: 'Tech' },
    { keyword: 'Azure', priority: 'low', category: 'Tech' },
    { keyword: 'Flutter', priority: 'low', category: 'Tech' },
    { keyword: 'Scrum', priority: 'low', category: 'Tech' },
    { keyword: 'Agile', priority: 'low', category: 'Tech' },
    { keyword: 'ERP', priority: 'medium', category: 'Tech' },
    { keyword: 'SAP', priority: 'medium', category: 'Tech' },
    { keyword: 'Oracle', priority: 'low', category: 'Tech' },
    { keyword: 'Testing', priority: 'low', category: 'Tech' },
    { keyword: 'Cyber Security', priority: 'medium', category: 'Tech' },
    { keyword: 'Cloud', priority: 'medium', category: 'Tech' },

    // Industries & Sectors
    { keyword: 'Fintech', priority: 'high', category: 'Industry' },
    { keyword: 'FMCG', priority: 'high', category: 'Industry' },
    { keyword: 'Oil and Gas', priority: 'medium', category: 'Industry' },
    { keyword: 'Telecom', priority: 'medium', category: 'Industry' },
    { keyword: 'Tourism', priority: 'low', category: 'Industry' },
    { keyword: 'Travel', priority: 'low', category: 'Industry' },
    { keyword: 'Aviation', priority: 'low', category: 'Industry' },
    { keyword: 'Startup', priority: 'high', category: 'Industry' },
    { keyword: 'Pharmaceutical', priority: 'medium', category: 'Industry' },
    { keyword: 'Automotive', priority: 'low', category: 'Industry' },
    { keyword: 'Food', priority: 'medium', category: 'Industry' },
    { keyword: 'Beverage', priority: 'low', category: 'Industry' },
    { keyword: 'Media', priority: 'medium', category: 'Industry' },
    { keyword: 'Advertising', priority: 'medium', category: 'Industry' },

    // Remote & Work Types
    { keyword: 'Hybrid', priority: 'medium', category: 'WorkType' },
    { keyword: 'Entry Level', priority: 'high', category: 'WorkType' },

    // Languages
    { keyword: 'Bilingual', priority: 'low', category: 'Languages' }
];

const CITIES = [
    'Egypt',
    'Cairo',
    'Giza',
    'Alexandria',
    'New Cairo',
    'Nasr City',
    'Heliopolis',
    'Maadi',
    '6th of October',
    'Sheikh Zayed',
    'Smart Village',
    'Obour',
    'Shorouk',
    'Dokki',
    'Mohandessin',
    'Tanta',
    'Mansoura',
    'Ismailia',
    'Suez',
    'Port Said',
    'Damietta',
    'Zagazig',
    'Fayoum',
    'Beni Suef',
    'Minya',
    'Assiut',
    'Luxor',
    'Aswan',
    'Hurghada',
    'Sharm El Sheikh'
];

function parseNumber(value: string | undefined, fallback: number): number {
    const num = value ? parseInt(value, 10) : NaN;
    return Number.isFinite(num) ? num : fallback;
}

function parseModes(): ScrapeMode[] {
    const mode = (process.env.SCRAPE_MODE || 'incremental').toLowerCase();
    if (mode === 'both') return ['incremental', 'backfill'];
    if (mode === 'backfill') return ['backfill'];
    return ['incremental'];
}

export class IndeedQueryPlanner {
    private keywords: KeywordConfig[];
    private cities: string[];

    constructor() {
        this.keywords = [...KEYWORDS].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
        });
        this.cities = [...CITIES];
        this.applyLimits();
    }

    private applyLimits() {
        const isDryRun = process.env.DRY_RUN === '1';
        const defaultLimitKeywords = isDryRun ? 1 : 0;
        const defaultLimitCities = isDryRun ? 1 : 0;

        const offsetKeywords = parseNumber(process.env.KEYWORD_OFFSET, 0);
        const offsetCities = parseNumber(process.env.CITY_OFFSET, 0);
        const limitKeywords = parseNumber(process.env.LIMIT_KEYWORDS, defaultLimitKeywords);
        const limitCities = parseNumber(process.env.LIMIT_CITIES, defaultLimitCities);

        if (offsetKeywords > 0) this.keywords = this.keywords.slice(offsetKeywords);
        if (offsetCities > 0) this.cities = this.cities.slice(offsetCities);
        if (limitKeywords > 0) this.keywords = this.keywords.slice(0, limitKeywords);
        if (limitCities > 0) this.cities = this.cities.slice(0, limitCities);
    }

    getQueries(): QuerySpec[] {
        const incrementalDays = parseNumber(process.env.INCREMENTAL_DAYS, DEFAULT_INCREMENTAL_DAYS);
        const backfillDays = parseNumber(process.env.BACKFILL_DAYS, DEFAULT_BACKFILL_DAYS);
        const modes = parseModes();

        const queries: QuerySpec[] = [];
        for (const keyword of this.keywords) {
            for (const city of this.cities) {
                for (const mode of modes) {
                    const days = mode === 'backfill' ? backfillDays : incrementalDays;
                    const queryKey = `${keyword.keyword}||${city}||${mode}`;
                    queries.push({
                        keyword: keyword.keyword,
                        city,
                        mode,
                        days,
                        priority: keyword.priority,
                        category: keyword.category,
                        queryKey
                    });
                }
            }
        }
        return queries;
    }
}
