import pool from '../../database/db';

export class InternalBenchmarkAggregator {
    /**
     * Aggregates declared salaries from jobs table and stores them as verified ground-truth benchmarks
     */
    public async run(): Promise<{ totalAggregated: number }> {
        console.log('================================================');
        console.log('   [INTERNAL DECLARED SALARY AGGREGATOR]        ');
        console.log('================================================');

        const query = `
            SELECT 
                LOWER(TRIM(title_normalized)) as title_normalized,
                MAX(title_raw) as role_title,
                category,
                PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY salary_min) as p10_salary,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (salary_min + salary_max) / 2) as median_salary,
                PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY salary_max) as p90_salary,
                MIN(salary_min) as min_salary,
                MAX(salary_max) as max_salary,
                COUNT(*) as sample_count
            FROM (
                SELECT 
                    title_normalized,
                    title_raw,
                    COALESCE(job_category, 'Other / Uncategorized') as category,
                    salary_min,
                    COALESCE(salary_max, salary_min) as salary_max
                FROM jobs
                WHERE salary_min IS NOT NULL 
                  AND salary_min > 2000 
                  AND salary_min < 500000
                  AND currency IN ('EGP', 'LE', 'Egp', NULL)
            ) sub
            GROUP BY LOWER(TRIM(title_normalized)), category
            HAVING COUNT(*) >= 2;
        `;

        const res = await pool.query(query);
        console.log(`[InternalAggregator] Found ${res.rows.length} statistically robust role benchmarks from declared salaries.`);

        let count = 0;
        for (const row of res.rows) {
            const upsertQuery = `
                INSERT INTO salary_benchmarks (
                    role_title,
                    title_normalized,
                    category,
                    company_name,
                    country,
                    min_salary,
                    median_salary,
                    max_salary,
                    p10_salary,
                    p90_salary,
                    currency,
                    source,
                    source_url,
                    updated_at
                ) VALUES ($1, $2, $3, NULL, 'Egypt', $4, $5, $6, $7, $8, 'EGP', 'Internal_Wuzzuf_Forasna', 'database://jobs', NOW())
                ON CONFLICT (title_normalized, category, company_name, source)
                DO UPDATE SET
                    min_salary = EXCLUDED.min_salary,
                    median_salary = EXCLUDED.median_salary,
                    max_salary = EXCLUDED.max_salary,
                    p10_salary = EXCLUDED.p10_salary,
                    p90_salary = EXCLUDED.p90_salary,
                    updated_at = NOW();
            `;

            await pool.query(upsertQuery, [
                row.role_title,
                row.title_normalized,
                row.category,
                Math.round(row.min_salary),
                Math.round(row.median_salary),
                Math.round(row.max_salary),
                Math.round(row.p10_salary),
                Math.round(row.p90_salary)
            ]);
            count++;
        }

        console.log(`✅ [InternalAggregator Complete] Ingested ${count} internal ground-truth benchmarks.`);
        return { totalAggregated: count };
    }
}

// CLI execution
if (require.main === module) {
    const agg = new InternalBenchmarkAggregator();
    agg.run().then(() => pool.end()).catch(e => {
        console.error(e);
        pool.end();
        process.exit(1);
    });
}
