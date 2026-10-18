const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db' });
pool.query("DELETE FROM jobs WHERE source = 'Wuzzuf'")
    .then(r => { console.log('Deleted Wuzzuf jobs:', r.rowCount); pool.end(); })
    .catch(console.error);
