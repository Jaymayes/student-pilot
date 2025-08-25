import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from "./environment";

neonConfig.webSocketConstructor = ws;

// Environment validation is already done in environment.ts

// Database connection with error handling and retry logic
export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 30000, // 30 second timeout
  idleTimeoutMillis: 60000, // 60 second idle timeout
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