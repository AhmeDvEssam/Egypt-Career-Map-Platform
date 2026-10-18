const { Client } = require('pg');
const c = new Client({ user: 'egypt_jobs', host: 'localhost', database: 'egypt_jobs_db', password: 'egypt_jobs_2026', port: 5432 });
c.connect().then(async () => {
    const r1 = await c.query("SELECT COUNT(*) as total FROM jobs WHERE source='Bayt'");
    const r2 = await c.query("SELECT COUNT(*) as open FROM jobs WHERE source='Bayt' AND status='Open'");
    const r3 = await c.query("SELECT COUNT(*) as closed FROM jobs WHERE source='Bayt' AND status='Closed'");
    console.log('Total Bayt:', r1.rows[0].total);
    console.log('Open:', r2.rows[0].open);
    console.log('Closed:', r3.rows[0].closed);
    c.end();
});
