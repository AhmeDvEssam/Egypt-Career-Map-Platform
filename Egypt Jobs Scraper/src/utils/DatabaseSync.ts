import { Pool } from 'pg';
import { JobEntity } from '../core/ScraperInterface';

// PostgreSQL Connection String (Matches the Next.js Frontend Prisma DB)
const DATABASE_URL = "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db";

const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000
});

export class DatabaseSync {
    
    /**
     * Upserts a single job into the database live.
     * Prevents duplicates by checking source & source_job_id.
     */
    static async upsertJob(job: any, source: string) {
        const client = await pool.connect();
        try {
            // Parse salary string (e.g. "10000 - 15000 جنيه مصري", "EGP 35,000 - EGP 55,000", "EGP 35K - EGP 55K")
            let salary_min = null;
            let salary_max = null;
            let currency = null;
            if (job.salary && typeof job.salary === 'string' && !job.salary.includes('Not')) {
                const salText = job.salary;
                if (salText.includes('جنيه') || salText.includes('EGP') || salText.toLowerCase().includes('le')) currency = 'EGP';
                else if (salText.includes('دولار') || salText.includes('USD') || salText.includes('$')) currency = 'USD';
                else if (salText.includes('يورو') || salText.includes('EUR') || salText.includes('€')) currency = 'EUR';
                else if (salText.includes('SAR') || salText.includes('ريال')) currency = 'SAR';
                else if (salText.includes('AED') || salText.includes('درهم')) currency = 'AED';
                else currency = 'EGP';

                // Match numbers with optional 'K' or 'k' or decimals
                const regex = /(\d+(?:,\d+)?(?:\.\d+)?)\s*([kK])?/g;
                const values: number[] = [];
                let match: RegExpExecArray | null;
                while ((match = regex.exec(salText)) !== null) {
                    let num = parseFloat(match[1].replace(/,/g, ''));
                    if (match[2] && match[2].toLowerCase() === 'k') {
                        num *= 1000;
                    }
                    values.push(num);
                }

                if (values.length >= 1) {
                    salary_min = values[0];
                    if (values.length >= 2) salary_max = values[1];
                }
            }

            // Parse posted time
            let posted_date = null;
            if (job.posted_time) {
                const pd = new Date(job.posted_time);
                if (!isNaN(pd.getTime())) posted_date = pd.toISOString();
            }

            const internalCategory = job.title ? require('./CategoryMapper').categorizeJob(job.title) : 'Other / Uncategorized';
            const randomId = require('crypto').randomUUID();

            // Parse experience
            let min_experience = null;
            let max_experience = null;
            let avg_experience = null;
            if (job.experience_needed && typeof job.experience_needed === 'string') {
                const expMatches = job.experience_needed.match(/\d+/g);
                if (expMatches && expMatches.length >= 1) {
                    min_experience = parseInt(expMatches[0], 10);
                    if (expMatches.length >= 2) {
                        max_experience = parseInt(expMatches[1], 10);
                        avg_experience = (min_experience + max_experience) / 2;
                    } else {
                        avg_experience = min_experience;
                    }
                }
            }

            const query = `
                INSERT INTO "jobs" (
                    id, source, source_job_id, title_raw, company_name, 
                    location_raw, job_type, work_type, career_level, 
                    education_level, job_category, internal_category, job_url, scraped_at, status, updated_at,
                    salary_min, salary_max, currency, posted_date, logo_url, applicants, viewed,
                    min_experience, max_experience, avg_experience
                ) VALUES (
                    $1, $2, $3, $4, $5, 
                    $6, $7, $8, $9, 
                    $10, $11, $12, $13, NOW(), 'Open', NOW(),
                    $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23
                )
                ON CONFLICT (source, source_job_id) DO UPDATE SET
                    title_raw = EXCLUDED.title_raw,
                    company_name = EXCLUDED.company_name,
                    location_raw = EXCLUDED.location_raw,
                    job_type = COALESCE(EXCLUDED.job_type, jobs.job_type),
                    work_type = COALESCE(EXCLUDED.work_type, jobs.work_type),
                    career_level = COALESCE(EXCLUDED.career_level, jobs.career_level),
                    education_level = COALESCE(EXCLUDED.education_level, jobs.education_level),
                    job_category = COALESCE(EXCLUDED.job_category, jobs.job_category),
                    internal_category = EXCLUDED.internal_category,
                    job_url = EXCLUDED.job_url,
                    salary_min = COALESCE(EXCLUDED.salary_min, jobs.salary_min),
                    salary_max = COALESCE(EXCLUDED.salary_max, jobs.salary_max),
                    currency = COALESCE(EXCLUDED.currency, jobs.currency),
                    posted_date = COALESCE(EXCLUDED.posted_date, jobs.posted_date),
                    min_experience = COALESCE(EXCLUDED.min_experience, jobs.min_experience),
                    max_experience = COALESCE(EXCLUDED.max_experience, jobs.max_experience),
                    avg_experience = COALESCE(EXCLUDED.avg_experience, jobs.avg_experience),
                    logo_url = EXCLUDED.logo_url,
                    applicants = EXCLUDED.applicants,
                    viewed = EXCLUDED.viewed,
                    status = 'Open',
                    scraped_at = NOW(),
                    updated_at = NOW();
            `;
            
            const values = [
                randomId,
                source,
                job.source_job_id || job.job_id,
                job.title,
                job.company_name,
                job.location,
                job.job_type || null,
                job.work_type || null,
                job.career_level || null,
                job.education_level || null,
                job.job_categories || null,
                internalCategory,
                job.url,
                salary_min,
                salary_max,
                currency,
                posted_date,
                job.logo_url || null,
                job.applicants || 0,
                job.viewed || 0,
                min_experience,
                max_experience,
                avg_experience
            ];

            await client.query(query, values);
            
            if (job.description || job.requirements) {
                // First, get the internal UUID of the job
                const res = await client.query(`SELECT id FROM "jobs" WHERE source = $1 AND source_job_id = $2`, [source, job.source_job_id || job.job_id]);
                if (res.rows.length > 0) {
                    const internalJobId = res.rows[0].id;
                    
                    // Delete existing descriptions to avoid duplicates
                    await client.query(`DELETE FROM "job_descriptions" WHERE job_id = $1`, [internalJobId]);

                    // Insert fresh descriptions
                    if (job.description) {
                        await client.query(`
                            INSERT INTO "job_descriptions" (id, job_id, type, content)
                            VALUES ($1, $2, 'DESCRIPTION', $3)
                        `, [require('crypto').randomUUID(), internalJobId, job.description]);
                    }
                    if (job.requirements) {
                        await client.query(`
                            INSERT INTO "job_descriptions" (id, job_id, type, content)
                            VALUES ($1, $2, 'REQUIREMENTS', $3)
                        `, [require('crypto').randomUUID(), internalJobId, job.requirements]);
                    }
                    if (job.skills && job.skills !== 'Not Specified') {
                        // Note: If 'SKILLS' is not in the Enum (JobDescriptionType), this query might throw an error.
                        // I added 'SKILLS' to the Enum via db_alter.js, but since it didn't exist it might just be a string column in some implementations. 
                        // To be safe, we insert it.
                        await client.query(`
                            INSERT INTO "job_descriptions" (id, job_id, type, content)
                            VALUES ($1, $2, 'SKILLS', $3)
                        `, [require('crypto').randomUUID(), internalJobId, job.skills]).catch(() => console.error('[DB Sync] SKILLS type might not be supported in Enum.'));
                    }
                }
            }

        } catch (error: any) {
            console.error(`[DB Sync] Error syncing job ${job.source_job_id || job.job_id} to database:`, error.message);
            throw error; // Rethrow so the caller knows it failed
        } finally {
            client.release();
        }
    }

    /**
     * Closes the pool connection gracefully.
     */
    static async close() {
        await pool.end();
    }
}
