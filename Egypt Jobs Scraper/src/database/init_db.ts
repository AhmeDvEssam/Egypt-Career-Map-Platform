
import pool from './db';
import * as fs from 'fs';
import * as path from 'path';

async function initDB() {
    console.log('🔄 Initializing Database Schema...');

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(schemaSql);
            await client.query('COMMIT');
            console.log('✅ Database Schema applied successfully!');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDB();
