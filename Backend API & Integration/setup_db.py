import psycopg2
conn = psycopg2.connect('postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db')
conn.autocommit = True
cur = conn.cursor()
cur.execute('DROP TABLE IF EXISTS saved_questions;')
cur.execute('''
CREATE TABLE saved_questions (
    id UUID PRIMARY KEY,
    question TEXT NOT NULL,
    intent JSONB NOT NULL,
    embedding FLOAT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
''')
cur.execute('''
CREATE OR REPLACE FUNCTION cosine_similarity(a float[], b float[])
RETURNS float AS $$
DECLARE
    dot_product float := 0;
    norm_a float := 0;
    norm_b float := 0;
    i int;
BEGIN
    FOR i IN 1..array_length(a, 1) LOOP
        dot_product := dot_product + (a[i] * b[i]);
        norm_a := norm_a + (a[i] * a[i]);
        norm_b := norm_b + (b[i] * b[i]);
    END LOOP;
    IF norm_a = 0 OR norm_b = 0 THEN
        RETURN 0;
    END IF;
    RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
''')
print("DB setup complete.")
