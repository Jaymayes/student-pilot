import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from "./environment";

neonConfig.webSocketConstructor = ws;

// Environment validation is already done in environment.ts

// Database connection with error handling and retry logic
// Using a small pool size to prevent "too many connections" errors
// Neon serverless recommends max: 1-10 for serverless environments
export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  max: 5, // Limit concurrent connections to prevent exhaustion
  connectionTimeoutMillis: 30000, // 30 second timeout
  idleTimeoutMillis: 30000, // 30 second idle timeout (reduced to free connections faster)
  maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export const db = drizzle({ client: pool, schema });