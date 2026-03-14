
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from './config';
import * as schema from '@shared/schema';
import { logger } from "./utils/logger";

neonConfig.webSocketConstructor = ws;

let db: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!config.DATABASE_URL) {
    logger.warn('DATABASE_URL not found, using memory storage');
    return null;
  }

  if (!db) {
    const pool = new Pool({ connectionString: config.DATABASE_URL });
    db = drizzle(pool, { schema });
  }

  return db;
}

export type Database = NonNullable<ReturnType<typeof getDatabase>>;
