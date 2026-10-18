import pool from '../database/db';

export class SalaryEstimationEngine {
    /**
     * Run the salary estimation and imputation pipeline
     */
    public async run(options: { forceAll?: boolean } = {}): Promise<void> {
        console.log('================================================');
        console.log('   [EGYPT SALARY ESTIMATION & IMPUTATION ENGINE]');
        console.log('================================================');

        // Step 0: Ensure database indexes for high-speed batch execution
        console.log('\n[Step 0/4] Verifying indexing on jobs table...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_jobs_int_cat ON jobs(internal_category);
            CREATE INDEX IF NOT EXISTS idx_jobs_job_cat ON jobs(job_category);
            CREATE INDEX IF NOT EXISTS idx_jobs_est_sal ON jobs(estimated_salary_min);
            CREATE INDEX IF NOT EXISTS idx_jobs_norm_title ON jobs(title_normalized);
        `);
        console.log('✅ Indexes verified.');

        // Step 1: Normalize employer-declared jobs first
        console.log('\n[Step 1/4] Tagging employer-declared salaries...');
        const declaredRes = await pool.query(`
            UPDATE jobs
            SET 
                estimated_salary_min = salary_min,
                estimated_salary_max = COALESCE(salary_max, salary_min),
                salary_confidence = 'Employer-Declared',
                salary_source_type = 'Employer-Declared',
                updated_at = NOW()
            WHERE salary_min IS NOT NULL
              AND (estimated_salary_min IS NULL OR $1 = true);
        `, [options.forceAll || false]);
        console.log(`✅ Marked ${declaredRes.rowCount} employer-declared jobs.`);

        // Step 2: Role-level benchmark matching (Exact match on normalized title)
        console.log('\n[Step 2/4] Matching missing salaries against Role Benchmarks (Paylab & Market)...');
        const roleMatchRes = await pool.query(`
            WITH matched_benchmarks AS (
                SELECT DISTINCT ON (j.id)
                    j.id,
                    CASE 
                        WHEN j.career_level ILIKE '%senior%' OR j.career_level ILIKE '%lead%' OR j.min_experience >= 5
                            THEN b.median_salary
                        WHEN j.career_level ILIKE '%entry%' OR j.career_level ILIKE '%junior%' OR (j.min_experience IS NOT NULL AND j.min_experience <= 2)
                            THEN b.min_salary
                        ELSE b.min_salary
                    END as est_min,
                    CASE 
                        WHEN j.career_level ILIKE '%senior%' OR j.career_level ILIKE '%lead%' OR j.min_experience >= 5
                            THEN b.max_salary
                        WHEN j.career_level ILIKE '%entry%' OR j.career_level ILIKE '%junior%' OR (j.min_experience IS NOT NULL AND j.min_experience <= 2)
                            THEN b.median_salary
                        ELSE b.max_salary
                    END as est_max,
                    b.source
                FROM jobs j
                JOIN salary_benchmarks b 
                  ON LOWER(TRIM(j.title_normalized)) = b.title_normalized
                WHERE j.salary_min IS NULL
                  AND (j.estimated_salary_min IS NULL OR $1 = true)
                ORDER BY j.id, 
                    CASE WHEN b.source = 'Internal_Wuzzuf_Forasna' THEN 1 ELSE 2 END
            )
            UPDATE jobs j
            SET
                estimated_salary_min = m.est_min,
                estimated_salary_max = m.est_max,
                salary_confidence = 'High (Role-Benchmark)',
                salary_source_type = m.source,
                updated_at = NOW()
            FROM matched_benchmarks m
            WHERE j.id = m.id;
        `, [options.forceAll || false]);
        console.log(`✅ Imputed ${roleMatchRes.rowCount} jobs using High-Confidence Role Benchmarks.`);

        // Step 3: Fast unified Category-level mapping
        console.log('\n[Step 3/4] Imputing un-salaried jobs using Category Macro Benchmarks...');
        const categoryMapRes = await pool.query(`
            WITH mapping(internal_name, benchmark_cat) AS (
                VALUES 
                    ('Software Engineering & IT', 'Software Development / IT'),
                    ('Software Engineering & IT', 'Information Technology'),
                    ('Marketing & Sales', 'Marketing / PR'),
                    ('Marketing & Sales', 'Sales / Business Development'),
                    ('Marketing & Sales', 'Commerce'),
                    ('Business & Finance', 'Accounting / Finance'),
                    ('Business & Finance', 'Economy, Finance, Accountancy'),
                    ('Business & Finance', 'Banking'),
                    ('Engineering & Construction', 'Engineering / Construction'),
                    ('Engineering & Construction', 'Electrical & Power Engineering'),
                    ('Engineering & Construction', 'Mechanical Engineering'),
                    ('Supply Chain & Logistics', 'Logistics / Supply Chain'),
                    ('Supply Chain & Logistics', 'Transport, Haulage, Logistics'),
                    ('Customer Service & Support', 'Customer Service / Support'),
                    ('Customer Service & Support', 'Customer Support'),
                    ('Human Resources', 'Human Resources'),
                    ('Operations & Management', 'Operations / Administration'),
                    ('Operations & Management', 'Management'),
                    ('Education & Training', 'Education / Training'),
                    ('Manufacturing & Production', 'Production')
            ),
            category_stats AS (
                SELECT 
                    m.internal_name,
                    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY b.min_salary)) as p25_min,
                    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY b.median_salary)) as median_val,
                    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY b.max_salary)) as p75_max
                FROM mapping m
                JOIN salary_benchmarks b ON b.category = m.benchmark_cat
                GROUP BY m.internal_name
            )
            UPDATE jobs j
            SET
                estimated_salary_min = CASE 
                    WHEN j.career_level ILIKE '%senior%' OR j.career_level ILIKE '%lead%' OR j.min_experience >= 5
                        THEN cs.median_val
                    ELSE cs.p25_min
                END,
                estimated_salary_max = CASE 
                    WHEN j.career_level ILIKE '%entry%' OR j.career_level ILIKE '%junior%' OR (j.min_experience IS NOT NULL AND j.min_experience <= 2)
                        THEN cs.median_val
                    ELSE cs.p75_max
                END,
                salary_confidence = 'Medium (Category-Benchmark)',
                salary_source_type = 'Category-Average',
                updated_at = NOW()
            FROM category_stats cs
            WHERE j.salary_min IS NULL
              AND j.estimated_salary_min IS NULL
              AND j.internal_category = cs.internal_name;
        `);
        console.log(`✅ Imputed ${categoryMapRes.rowCount} jobs using Unified Category Benchmarks.`);

        // Step 4: Macro Market Floor Fallback for any remaining unclassified Egyptian jobs
        console.log('\n[Step 4/4] Applying National Market Floor for remaining unclassified roles...');
        const macroRes = await pool.query(`
            WITH national_stats AS (
                SELECT 
                    ROUND(PERCENTILE_CONT(0.20) WITHIN GROUP (ORDER BY min_salary)) as national_min,
                    ROUND(PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY max_salary)) as national_max
                FROM salary_benchmarks
            )
            UPDATE jobs j
            SET
                estimated_salary_min = ns.national_min,
                estimated_salary_max = ns.national_max,
                salary_confidence = 'Baseline (National Market Floor)',
                salary_source_type = 'National-Average',
                updated_at = NOW()
            FROM national_stats ns
            WHERE j.estimated_salary_min IS NULL;
        `);
        console.log(`✅ Imputed ${macroRes.rowCount} remaining unclassified jobs with National Market Distribution.`);

        // Summary report
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(estimated_salary_min) as enriched_jobs,
                ROUND(COUNT(estimated_salary_min)::numeric / COUNT(*) * 100, 2) as coverage_pct,
                salary_confidence,
                COUNT(*) as count_by_confidence
            FROM jobs
            GROUP BY salary_confidence
            ORDER BY count_by_confidence DESC;
        `);
        console.log('\n================================================');
        console.log('   [SALARY INTELLIGENCE ENRICHMENT SUMMARY]     ');
        console.log('================================================');
        console.table(stats.rows);
    }
}

// CLI execution
if (require.main === module) {
    const engine = new SalaryEstimationEngine();
    engine.run({ forceAll: true }).then(() => pool.end()).catch(e => {
        console.error(e);
        pool.end();
        process.exit(1);
    });
}
