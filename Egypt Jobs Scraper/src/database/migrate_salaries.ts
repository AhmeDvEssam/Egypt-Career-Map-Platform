import pool from './db';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- Running Salary Intelligence Migration ---');
        await client.query(`
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_salary_min NUMERIC;
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_salary_max NUMERIC;
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_confidence VARCHAR(50);
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_source_type VARCHAR(50);

            CREATE TABLE IF NOT EXISTS salary_benchmarks (
                id SERIAL PRIMARY KEY,
                role_title VARCHAR(255) NOT NULL,
                title_normalized VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                company_name VARCHAR(255),
                country VARCHAR(50) DEFAULT 'Egypt',
                min_salary NUMERIC,
                median_salary NUMERIC,
                max_salary NUMERIC,
                p10_salary NUMERIC,
                p90_salary NUMERIC,
                currency VARCHAR(10) DEFAULT 'EGP',
                source VARCHAR(50) NOT NULL,
                source_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT uq_salary_benchmarks UNIQUE(title_normalized, category, company_name, source)
            );

            CREATE INDEX IF NOT EXISTS idx_benchmarks_title ON salary_benchmarks(title_normalized);
            CREATE INDEX IF NOT EXISTS idx_benchmarks_category ON salary_benchmarks(category);
        `);
        console.log('✅ Migration succeeded: jobs columns added & salary_benchmarks table created.');

        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'salary_benchmarks'");
        console.log('salary_benchmarks columns:', res.rows.map((r: any) => r.column_name));
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
