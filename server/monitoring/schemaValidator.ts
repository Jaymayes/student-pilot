/**
 * Database Schema Validator - Automated schema error detection and recovery
 * Monitors schema integrity and provides automated recovery suggestions
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { secureLogger } from '../logging/secureLogger';
import { alertManager } from './alertManager';

interface SchemaValidationResult {
  tableName: string;
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  recordCount: number;
  lastChecked: Date;
}

interface SchemaReport {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  lastValidation: Date;
  totalTables: number;
  healthyTables: number;
  warningTables: number;
  errorTables: number;
  validationResults: SchemaValidationResult[];
  recommendations: string[];
}

class SchemaValidator {
  private readonly CRITICAL_TABLES = [
    'users',
    'sessions', 
    'student_profiles',
    'scholarships',
    'applications',
    'scholarship_matches',  // Fixed: was 'matches'
    'usage_events',
    'credit_ledger',  // Fixed: was 'ledger_entries'
  ];

  /**
   * Validate table existence and basic structure
   */
  async validateTable(tableName: string): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      tableName,
      status: 'healthy',
      issues: [],
      recordCount: 0,
      lastChecked: new Date(),
    };

    try {
      // Security check: Only allow whitelisted table names
      if (!this.CRITICAL_TABLES.includes(tableName)) {
        result.status = 'error';
        result.issues.push('Table not in critical tables whitelist');
        return result;
      }

      // Check table existence
      const tableExists = await this.checkTableExists(tableName);
      if (!tableExists) {
        result.status = 'error';
        result.issues.push('Table does not exist');
        return result;
      }

      // Get record count using parameterized query
      try {
        const countResult = await db.execute(
          sql`SELECT count(*) as count FROM ${sql.identifier(tableName)}`
        );
        result.recordCount = Number(((countResult as any).rows || (countResult as any))[0]?.count || 0);
      } catch (error) {
        result.status = 'warning';
        result.issues.push('Unable to count records - possible permission issue');
      }

      // Check for common schema issues
      await this.checkTableIntegrity(tableName, result);

    } catch (error: any) {
      result.status = 'error';
      result.issues.push(`Validation failed: ${error.message}`);
      secureLogger.error(`Schema validation failed for table ${tableName}`, error as Error);
    }

    return result;
  }

  /**
   * Check if table exists
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `);
      
      return Boolean(((result as any).rows || (result as any))[0]?.exists);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check table integrity constraints and relationships
   */
  private async checkTableIntegrity(tableName: string, result: SchemaValidationResult): Promise<void> {
    try {
      // Check for missing primary key
      const pkResult = await db.execute(sql`
        SELECT count(*) as pk_count
        FROM information_schema.table_constraints 
        WHERE table_name = ${tableName}
        AND constraint_type = 'PRIMARY KEY';
      `);
      
      const pkCount = Number(((pkResult as any).rows || (pkResult as any))[0]?.pk_count || 0);
      if (pkCount === 0) {
        result.status = 'error';
        result.issues.push('Missing primary key constraint');
      }

      // Check for broken foreign key constraints (specific to critical tables)
      if (tableName === 'student_profiles') {
        const fkResult = await db.execute(sql`
          SELECT count(*) as orphaned
          FROM student_profiles sp
          LEFT JOIN users u ON sp.user_id = u.id
          WHERE u.id IS NULL;
        `);
        
        const orphanedCount = Number(((fkResult as any).rows || (fkResult as any))[0]?.orphaned || 0);
        if (orphanedCount > 0) {
          result.status = 'warning';
          result.issues.push(`${orphanedCount} orphaned student profiles with invalid user_id`);
        }
      }

      // Check for NULL values in critical NOT NULL columns
      if (tableName === 'usage_events') {
        const nullCheck = await db.execute(sql`
          SELECT count(*) as null_users
          FROM usage_events
          WHERE user_id IS NULL;
        `);
        
        const nullCount = Number(((nullCheck as any).rows || (nullCheck as any))[0]?.null_users || 0);
        if (nullCount > 0) {
          result.status = 'warning';
          result.issues.push(`${nullCount} usage events with NULL user_id`);
        }
      }

      // Check for duplicate entries in unique constraint tables
      if (tableName === 'users') {
        const duplicateCheck = await db.execute(sql`
          SELECT count(*) as duplicates
          FROM (
            SELECT email, count(*)
            FROM users
            WHERE email IS NOT NULL
            GROUP BY email
            HAVING count(*) > 1
          ) dup;
        `);
        
        const duplicateCount = Number(((duplicateCheck as any).rows || (duplicateCheck as any))[0]?.duplicates || 0);
        if (duplicateCount > 0) {
          result.status = 'error';
          result.issues.push(`${duplicateCount} duplicate email addresses found`);
        }
      }

    } catch (error: any) {
      result.issues.push(`Integrity check failed: ${error.message}`);
      if (result.status === 'healthy') {
        result.status = 'warning';
      }
    }
  }

  /**
   * Generate comprehensive schema validation report
   */
  async generateSchemaReport(): Promise<SchemaReport> {
    const validationResults: SchemaValidationResult[] = [];
    
    try {
      // Validate all critical tables
      for (const tableName of this.CRITICAL_TABLES) {
        const result = await this.validateTable(tableName);
        validationResults.push(result);
      }

      // Calculate summary statistics
      const totalTables = validationResults.length;
      const healthyTables = validationResults.filter(r => r.status === 'healthy').length;
      const warningTables = validationResults.filter(r => r.status === 'warning').length;
      const errorTables = validationResults.filter(r => r.status === 'error').length;

      // Determine overall health
      let overallHealth: 'healthy' | 'degraded' | 'critical';
      if (errorTables > 0) {
        overallHealth = 'critical';
      } else if (warningTables > totalTables * 0.3) { // More than 30% warnings
        overallHealth = 'degraded';
      } else {
        overallHealth = 'healthy';
      }

      // Generate recommendations
      const recommendations: string[] = [];
      const errorResults = validationResults.filter(r => r.status === 'error');
      const warningResults = validationResults.filter(r => r.status === 'warning');

      if (errorResults.length > 0) {
        recommendations.push(`Critical: Fix ${errorResults.length} table(s) with errors before production`);
        errorResults.forEach(r => {
          recommendations.push(`- ${r.tableName}: ${r.issues.join(', ')}`);
        });
      }

      if (warningResults.length > 0) {
        recommendations.push(`Review ${warningResults.length} table(s) with warnings`);
      }

      if (overallHealth === 'healthy') {
        recommendations.push('Schema validation passed - all tables are healthy');
      }

      // Create alerts for critical issues
      if (errorTables > 0) {
        await alertManager.createAlert({
          severity: 'critical',
          service: 'database-schema',
          title: 'Critical Schema Validation Errors',
          description: `${errorTables} critical table(s) have schema errors that require immediate attention`,
          source: 'schema-validator',
          metadata: {
            errorTables,
            warningTables,
            affectedTables: errorResults.map(r => r.tableName),
          },
        });
      } else if (warningTables > totalTables * 0.5) {
        await alertManager.createAlert({
          severity: 'warning',
          service: 'database-schema',
          title: 'Multiple Schema Validation Warnings',
          description: `${warningTables} table(s) have schema warnings that should be reviewed`,
          source: 'schema-validator',
          metadata: {
            warningTables,
            affectedTables: warningResults.map(r => r.tableName),
          },
        });
      }

      return {
        overallHealth,
        lastValidation: new Date(),
        totalTables,
        healthyTables,
        warningTables,
        errorTables,
        validationResults,
        recommendations,
      };

    } catch (error: any) {
      secureLogger.error('Schema validation report generation failed', error as Error);
      
      return {
        overallHealth: 'critical',
        lastValidation: new Date(),
        totalTables: this.CRITICAL_TABLES.length,
        healthyTables: 0,
        warningTables: 0,
        errorTables: this.CRITICAL_TABLES.length,
        validationResults: [],
        recommendations: [
          'Critical: Schema validation system failure',
          'Check database connectivity and permissions',
          'Review monitoring system logs for detailed error information',
        ],
      };
    }
  }

  /**
   * Setup schema validation routes
   */
  setupRoutes(app: any): void {
    // Schema validation health check (MUST be defined before parameterized routes)
    app.get('/api/monitoring/schema/health', (req: Request, res: Response) => {
      res.json({
        status: 'active',
        timestamp: new Date(),
        monitoredTables: this.CRITICAL_TABLES,
        validationFrequency: '15 minutes',
      });
    });

    // Get comprehensive schema validation report
    app.get('/api/monitoring/schema', async (req: Request, res: Response) => {
      try {
        const report = await this.generateSchemaReport();
        res.json(report);
      } catch (error) {
        secureLogger.error('Schema validation endpoint error', error as Error);
        res.status(500).json({
          error: 'Failed to generate schema validation report',
          timestamp: new Date(),
        });
      }
    });

    // Validate specific table (MUST be defined after specific routes)
    app.get('/api/monitoring/schema/:tableName', async (req: Request, res: Response) => {
      try {
        const { tableName } = req.params;
        
        // Validate table name (security check)
        if (!this.CRITICAL_TABLES.includes(tableName)) {
          return res.status(400).json({
            error: 'Invalid table name. Only critical tables can be validated.',
            validTables: this.CRITICAL_TABLES,
          });
        }
        
        const result = await this.validateTable(tableName);
        res.json(result);
      } catch (error) {
        secureLogger.error(`Schema validation error for table ${req.params.tableName}`, error as Error);
        res.status(500).json({
          error: 'Failed to validate table schema',
          timestamp: new Date(),
        });
      }
    });
  }
}

// Singleton instance
export const schemaValidator = new SchemaValidator();

// Run schema validation every 15 minutes
setInterval(async () => {
  try {
    const report = await schemaValidator.generateSchemaReport();
    secureLogger.info('Schema validation completed', {
      overallHealth: report.overallHealth,
      errorTables: report.errorTables,
      warningTables: report.warningTables,
      healthyTables: report.healthyTables,
    });
  } catch (error) {
    secureLogger.error('Scheduled schema validation failed', error as Error);
  }
}, 15 * 60 * 1000);

export default SchemaValidator;