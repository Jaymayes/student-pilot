import { db } from './db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

interface BackupMetadata {
  timestamp: string;
  version: string;
  tables: string[];
  recordCounts: Record<string, number>;
  checksum: string;
}

interface RestoreValidationResult {
  success: boolean;
  tableCounts: Record<string, { before: number; after: number; expected: number }>;
  errors: string[];
}

export class BackupRestoreManager {
  private readonly backupDir = process.env.BACKUP_DIR || '/tmp/db-backups';
  
  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generate backup metadata for validation
   */
  async generateBackupMetadata(): Promise<BackupMetadata> {
    const tables = [
      'users', 'student_profiles', 'scholarships', 'applications', 
      'scholarship_matches', 'essays', 'documents', 'ttv_events',
      'cohorts', 'user_cohorts', 'purchases', 'credit_balances',
      'sessions'
    ];

    const recordCounts: Record<string, number> = {};
    
    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
        const rows = result.rows || result as any[];
        recordCounts[table] = parseInt((rows[0] as any).count);
      } catch (error) {
        console.warn(`Could not count records in table ${table}:`, error);
        recordCounts[table] = -1; // Mark as error
      }
    }

    const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + Math.max(0, count), 0);
    const checksum = this.generateChecksum(JSON.stringify(recordCounts));

    return {
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      tables,
      recordCounts,
      checksum
    };
  }

  /**
   * Test database connectivity and basic operations
   */
  async testDatabaseConnectivity(): Promise<{ success: boolean; details: any }> {
    try {
      // Test basic connectivity
      const healthResult = await db.execute(sql`SELECT 1 as health_check, version() as db_version, current_timestamp as server_time`);
      const healthRows = healthResult.rows || healthResult as any[];
      
      // Test write operation (create temporary table)
      await db.execute(sql`CREATE TEMP TABLE backup_test (id SERIAL PRIMARY KEY, test_data TEXT)`);
      await db.execute(sql`INSERT INTO backup_test (test_data) VALUES ('connectivity_test')`);
      const testResult = await db.execute(sql`SELECT test_data FROM backup_test WHERE test_data = 'connectivity_test'`);
      const testRows = testResult.rows || testResult as any[];
      await db.execute(sql`DROP TABLE backup_test`);

      // Test transaction capability
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT 1`);
      });

      return {
        success: true,
        details: {
          health: healthRows[0],
          writeTest: testRows.length > 0,
          transactionTest: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate data integrity after restore
   */
  async validateDataIntegrity(expectedMetadata: BackupMetadata): Promise<RestoreValidationResult> {
    const result: RestoreValidationResult = {
      success: true,
      tableCounts: {},
      errors: []
    };

    try {
      // Check each table's record count
      for (const table of expectedMetadata.tables) {
        try {
          const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
          const countRows = countResult.rows || countResult as any[];
          const currentCount = parseInt((countRows[0] as any).count);
          const expectedCount = expectedMetadata.recordCounts[table];

          result.tableCounts[table] = {
            before: -1, // Not available in this context
            after: currentCount,
            expected: expectedCount
          };

          if (currentCount !== expectedCount && expectedCount >= 0) {
            result.errors.push(`Table ${table}: expected ${expectedCount} records, found ${currentCount}`);
            result.success = false;
          }
        } catch (error) {
          result.errors.push(`Error checking table ${table}: ${error}`);
          result.success = false;
        }
      }

      // Check referential integrity
      const integrityChecks = [
        {
          name: 'user_profiles_relationship',
          query: `SELECT COUNT(*) as count FROM student_profiles sp 
                  LEFT JOIN users u ON sp.user_id = u.id 
                  WHERE u.id IS NULL`
        },
        {
          name: 'application_relationships',
          query: `SELECT COUNT(*) as count FROM applications a 
                  LEFT JOIN student_profiles sp ON a.student_id = sp.id 
                  LEFT JOIN scholarships s ON a.scholarship_id = s.id
                  WHERE sp.id IS NULL OR s.id IS NULL`
        },
        {
          name: 'match_relationships', 
          query: `SELECT COUNT(*) as count FROM scholarship_matches sm
                  LEFT JOIN student_profiles sp ON sm.student_id = sp.id
                  LEFT JOIN scholarships s ON sm.scholarship_id = s.id
                  WHERE sp.id IS NULL OR s.id IS NULL`
        }
      ];

      for (const check of integrityChecks) {
        try {
          const checkResult = await db.execute(sql.raw(check.query));
          const checkRows = checkResult.rows || checkResult as any[];
          const violationCount = parseInt((checkRows[0] as any).count);
          
          if (violationCount > 0) {
            result.errors.push(`Referential integrity violation in ${check.name}: ${violationCount} orphaned records`);
            result.success = false;
          }
        } catch (error) {
          result.errors.push(`Error in integrity check ${check.name}: ${error}`);
          result.success = false;
        }
      }

    } catch (error) {
      result.errors.push(`General validation error: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Generate a simple checksum for data validation
   */
  private generateChecksum(data: string): string {
    let hash = 0;
    if (data.length === 0) return hash.toString();
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Save backup metadata to file
   */
  async saveBackupMetadata(metadata: BackupMetadata, filename: string): Promise<void> {
    const filePath = path.join(this.backupDir, `${filename}.meta.json`);
    await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
    console.log(`Backup metadata saved to ${filePath}`);
  }

  /**
   * Load backup metadata from file  
   */
  async loadBackupMetadata(filename: string): Promise<BackupMetadata> {
    const filePath = path.join(this.backupDir, `${filename}.meta.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const [
        connectionStats,
        tableStats,
        indexStats
      ] = await Promise.all([
        // Connection statistics
        db.execute(sql`
          SELECT count(*) as total_connections, 
                 count(*) FILTER (WHERE state = 'active') as active_connections,
                 count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity
        `).then(result => (result.rows || result as any[])[0]),
        
        // Table statistics
        db.execute(sql`
          SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup
          FROM pg_stat_user_tables 
          ORDER BY n_live_tup DESC 
          LIMIT 10
        `).then(result => result.rows || result as any[]),
        
        // Index usage statistics
        db.execute(sql`
          SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
          FROM pg_stat_user_indexes 
          ORDER BY idx_scan DESC 
          LIMIT 10
        `).then(result => result.rows || result as any[])
      ]);

      return {
        timestamp: new Date().toISOString(),
        connections: connectionStats,
        tables: tableStats,
        indexes: indexStats
      };
    } catch (error) {
      throw new Error(`Failed to get database stats: ${error}`);
    }
  }

  /**
   * Perform comprehensive backup validation test
   */
  async performBackupTest(): Promise<{
    success: boolean;
    testId: string;
    results: any;
    errors: string[];
  }> {
    const testId = `backup-test-${Date.now()}`;
    const errors: string[] = [];
    const results: any = {};

    try {
      console.log(`Starting backup validation test: ${testId}`);

      // Step 1: Test database connectivity
      console.log('Testing database connectivity...');
      const connectivityTest = await this.testDatabaseConnectivity();
      results.connectivity = connectivityTest;
      
      if (!connectivityTest.success) {
        errors.push('Database connectivity test failed');
      }

      // Step 2: Generate backup metadata
      console.log('Generating backup metadata...');
      const metadata = await this.generateBackupMetadata();
      results.metadata = metadata;

      // Step 3: Validate data integrity
      console.log('Validating data integrity...');
      const integrityTest = await this.validateDataIntegrity(metadata);
      results.integrity = integrityTest;
      
      if (!integrityTest.success) {
        errors.push(...integrityTest.errors);
      }

      // Step 4: Get database statistics
      console.log('Collecting database statistics...');
      const stats = await this.getDatabaseStats();
      results.statistics = stats;

      // Step 5: Save test results
      const testResults = {
        testId,
        timestamp: new Date().toISOString(),
        success: errors.length === 0,
        results,
        errors
      };

      await this.saveBackupMetadata(testResults as any, testId);
      console.log(`Backup test completed: ${testId}`);

      return {
        success: errors.length === 0,
        testId,
        results,
        errors
      };

    } catch (error) {
      const errorMessage = `Backup test failed: ${error}`;
      errors.push(errorMessage);
      console.error(errorMessage);

      return {
        success: false,
        testId,
        results,
        errors
      };
    }
  }
}

// Export singleton instance
export const backupRestoreManager = new BackupRestoreManager();