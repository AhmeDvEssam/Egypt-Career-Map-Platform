
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. JOBS TABLE (Core Data)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(50) NOT NULL, -- 'LinkedIn', 'Wuzzuf', 'Indeed'
    source_job_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    location VARCHAR(255),
    
    -- Classifications
    job_type VARCHAR(100),        -- 'Full Time', 'Contract'
    work_type VARCHAR(100),       -- 'On-site', 'Remote', 'Hybrid'
    experience_level VARCHAR(100), -- 'Entry Level', 'Experienced'
    career_level VARCHAR(100),
    education_level VARCHAR(255),
    
    -- Salary
    salary_min NUMERIC(12, 2),
    salary_max NUMERIC(12, 2),
    currency VARCHAR(10),

    -- URLs
    job_url TEXT NOT NULL,
    company_url TEXT,

    -- Timestamps
    posted_date TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),

    -- Status & Raw Data
    status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Closed'
    source_raw JSONB, -- Store original raw data for backup

    -- Constraints
    CONSTRAINT unique_job_source UNIQUE (source, source_job_id)
);

-- Indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);


-- 2. JOB DESCRIPTIONS (Split Text)
CREATE TABLE IF NOT EXISTS job_descriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'responsibilities', 'requirements', 'qualifications'
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    is_primary BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_desc_job_id ON job_descriptions(job_id);


-- 3. SKILLS (Normalized)
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) -- Optional classification
);

-- 4. JOB_SKILLS (Junction)
CREATE TABLE IF NOT EXISTS job_skills (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    extracted_from VARCHAR(50), -- 'wuzzuf_tags', 'ai_extraction'
    PRIMARY KEY (job_id, skill_id)
);


-- 5. INDUSTRIES (Normalized)
CREATE TABLE IF NOT EXISTS industries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 6. JOB_INDUSTRIES (Junction)
CREATE TABLE IF NOT EXISTS job_industries (
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
    PRIMARY KEY (job_id, industry_id)
);
