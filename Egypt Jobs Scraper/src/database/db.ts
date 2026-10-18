
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

// Create a new pool using environment variables
// .env must have: DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT
// Or DATABASE_URL

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        }
        : {
            user: process.env.DB_USER || 'egypt_jobs',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'egypt_jobs_db',
            password: process.env.DB_PASSWORD || 'egypt_jobs_2026',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
        }
);

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();

export default pool;
