const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"
});

(async () => {
    try {
        await pool.query("ALTER TABLE jobs ADD COLUMN internal_category VARCHAR(255);");
        console.log("Added internal_category to jobs table.");
    } catch (e) {
        console.log(e.message);
    }
    
    // Also, checking how 'job_descriptions' is structured
    const res = await pool.query("SELECT enum_range(NULL::\"JobDescriptionType\");").catch(() => null);
    if (res) {
        console.log('Enum values:', res.rows);
    } else {
        console.log('Maybe not an enum, or just a varchar type.');
    }
    
    // Let's add SKILLS to the enum if it's an enum, otherwise we can just insert it.
    try {
        await pool.query("ALTER TYPE \"JobDescriptionType\" ADD VALUE 'SKILLS';");
        console.log("Added SKILLS to JobDescriptionType enum.");
    } catch (e) {
        console.log(e.message);
    }
    
    await pool.end();
})();
