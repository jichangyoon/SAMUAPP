
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from './config';
import * as schema from '@shared/schema';

let db: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!config.DATABASE_URL) {
    console.warn('DATABASE_URL not found, using memory storage');
    return null;
  }

  if (!db) {
    const sql = neon(config.DATABASE_URL);
    db = drizzle(sql, { schema });
  }

  return db;
}

export type Database = NonNullable<ReturnType<typeof getDatabase>>;
