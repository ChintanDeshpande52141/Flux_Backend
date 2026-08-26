import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DATABASE_URL presence is guaranteed by validateEnv() (config/env.ts), run
// once at process start in server.ts before this module is ever imported.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
