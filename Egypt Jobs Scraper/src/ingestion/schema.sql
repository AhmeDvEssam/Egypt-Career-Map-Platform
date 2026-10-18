-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL,
  source_job_id VARCHAR(255) NOT NULL,
  
  -- Raw Data
  title_raw TEXT NOT NULL,
  company_name_raw TEXT NOT NULL,
  location_raw TEXT NOT NULL,
  description_raw TEXT,
  
  -- Normalized Data
  title_normalized TEXT,
  location_normalized TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  currency VARCHAR(10),
  
  -- Metadata
  job_url TEXT NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_date TIMESTAMP WITH TIME ZONE,
  
  -- Extensible
  skills JSONB DEFAULT '[]',
  extra_metadata JSONB DEFAULT '{}',
  
  -- Constraints
  CONSTRAINT uq_jobs_source_id UNIQUE (source, source_job_id)
);

CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_scraped_at ON jobs(scraped_at);
