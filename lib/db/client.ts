import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Drizzle client over the Neon HTTP driver — one-shot queries, edge/serverless-safe.
 * (No long-lived pool, no transactions needed for this pipeline.) DATABASE_URL is
 * provisioned by the Vercel Neon integration in prod; a Neon dev branch locally.
 */
function makeDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  return drizzle(neon(url), { schema });
}

let _db: ReturnType<typeof makeDb> | null = null;

/** Lazily-constructed shared client. Throws clearly if DATABASE_URL is missing. */
export function db() {
  if (!_db) _db = makeDb();
  return _db;
}

export { schema };
