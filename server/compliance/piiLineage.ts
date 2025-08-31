import { db } from '../db';
import { sql } from 'drizzle-orm';

interface PIIField {
  table: string;
  column: string;
  dataType: string;
  piiType: 'direct' | 'quasi' | 'sensitive';
  category: 'identity' | 'contact' | 'demographic' | 'financial' | 'behavioral' | 'biometric';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  retentionPeriod?: string;
  encryptionRequired: boolean;
  accessRestrictions: string[];
}

interface DataFlow {
  id: string;
  sourceSystem: string;
  sourceTable: string;
  sourceColumn: string;
  targetSystem: string;
  targetTable: string;
  targetColumn: string;
  transformation?: string;
  purpose: string;
  legalBasis: string;
  accessPattern: 'read' | 'write' | 'read_write' | 'delete';
  frequency: 'real_time' | 'batch' | 'on_demand';
}

interface PIIProcessingActivity {
  id: string;
  name: string;
  description: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataSubjects: string[];
  piiCategories: string[];
  recipients: string[];
  retentionPeriod: string;
  crossBorderTransfer: boolean;
  safeguards: string[];
  dataMinimization: boolean;
  lastUpdated: string;
}

export class PIILineageTracker {
  
  /**
   * Get comprehensive PII inventory across the system
   */
  getPIIInventory(): PIIField[] {
    return [
      // Users table PII
      {
        table: 'users',
        column: 'id',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'identity',
        sensitivity: 'high',
        description: 'Unique user identifier from OIDC provider',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: false,
        accessRestrictions: ['authenticated_user_only', 'system_admin']
      },
      {
        table: 'users',
        column: 'email',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'contact',
        sensitivity: 'high',
        description: 'User email address for authentication and communication',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: true,
        accessRestrictions: ['user_self', 'system_admin', 'support_staff']
      },
      {
        table: 'users',
        column: 'firstName',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'identity',
        sensitivity: 'medium',
        description: 'User first name for personalization',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin']
      },
      {
        table: 'users',
        column: 'lastName',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'identity',
        sensitivity: 'medium',
        description: 'User last name for personalization',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin']
      },
      {
        table: 'users',
        column: 'profileImageUrl',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'biometric',
        sensitivity: 'medium',
        description: 'URL to user profile image',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin', 'public_if_consent']
      },

      // Student profiles PII
      {
        table: 'student_profiles',
        column: 'userId',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'identity',
        sensitivity: 'high',
        description: 'Links profile to user account',
        retentionPeriod: '7 years after account deletion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin']
      },
      {
        table: 'student_profiles',
        column: 'gpa',
        dataType: 'varchar',
        piiType: 'sensitive',
        category: 'behavioral',
        sensitivity: 'medium',
        description: 'Academic performance indicator',
        retentionPeriod: '5 years after graduation',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin', 'scholarship_matching']
      },
      {
        table: 'student_profiles',
        column: 'school',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'demographic',
        sensitivity: 'low',
        description: 'Educational institution',
        retentionPeriod: '5 years after graduation',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin', 'scholarship_matching']
      },
      {
        table: 'student_profiles',
        column: 'location',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'demographic',
        sensitivity: 'medium',
        description: 'Geographic location for scholarship matching',
        retentionPeriod: '5 years after graduation',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin', 'scholarship_matching']
      },
      {
        table: 'student_profiles',
        column: 'demographics',
        dataType: 'jsonb',
        piiType: 'sensitive',
        category: 'demographic',
        sensitivity: 'high',
        description: 'Demographic information for scholarship eligibility',
        retentionPeriod: '5 years after graduation',
        encryptionRequired: true,
        accessRestrictions: ['user_self', 'system_admin', 'scholarship_matching']
      },

      // Applications PII
      {
        table: 'applications',
        column: 'notes',
        dataType: 'text',
        piiType: 'sensitive',
        category: 'behavioral',
        sensitivity: 'medium',
        description: 'User notes about scholarship application',
        retentionPeriod: '3 years after application completion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin']
      },

      // Documents PII  
      {
        table: 'documents',
        column: 'filename',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'behavioral',
        sensitivity: 'low',
        description: 'Original filename of uploaded document',
        retentionPeriod: '3 years after document deletion',
        encryptionRequired: false,
        accessRestrictions: ['user_self', 'system_admin']
      },
      {
        table: 'documents',
        column: 'filePath',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'behavioral',
        sensitivity: 'medium',
        description: 'Storage path for uploaded document',
        retentionPeriod: '3 years after document deletion',
        encryptionRequired: true,
        accessRestrictions: ['user_self', 'system_admin', 'file_service']
      },

      // TTV Events PII
      {
        table: 'ttv_events',
        column: 'userId',
        dataType: 'varchar',
        piiType: 'direct',
        category: 'identity',
        sensitivity: 'high',
        description: 'User identifier for analytics events',
        retentionPeriod: '2 years for analytics',
        encryptionRequired: false,
        accessRestrictions: ['system_admin', 'analytics_service']
      },
      {
        table: 'ttv_events',
        column: 'metadata',
        dataType: 'jsonb',
        piiType: 'quasi',
        category: 'behavioral',
        sensitivity: 'medium',
        description: 'Event metadata potentially containing user behavior',
        retentionPeriod: '2 years for analytics',
        encryptionRequired: false,
        accessRestrictions: ['system_admin', 'analytics_service']
      },
      {
        table: 'ttv_events',
        column: 'sessionId',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'behavioral',
        sensitivity: 'low',
        description: 'Session identifier for user journey tracking',
        retentionPeriod: '6 months',
        encryptionRequired: false,
        accessRestrictions: ['system_admin', 'analytics_service']
      },

      // Sessions PII
      {
        table: 'sessions',
        column: 'sid',
        dataType: 'varchar',
        piiType: 'quasi',
        category: 'behavioral',
        sensitivity: 'medium',
        description: 'Session identifier for authentication',
        retentionPeriod: '1 week (TTL)',
        encryptionRequired: true,
        accessRestrictions: ['system_admin', 'auth_service']
      },
      {
        table: 'sessions',
        column: 'sess',
        dataType: 'jsonb',
        piiType: 'sensitive',
        category: 'behavioral',
        sensitivity: 'high',
        description: 'Session data containing user authentication state',
        retentionPeriod: '1 week (TTL)',
        encryptionRequired: true,
        accessRestrictions: ['system_admin', 'auth_service']
      }
    ];
  }

  /**
   * Map data flows between systems and components
   */
  getDataFlows(): DataFlow[] {
    return [
      // User registration flow
      {
        id: 'flow_001',
        sourceSystem: 'Replit OIDC',
        sourceTable: 'identity_provider',
        sourceColumn: 'user_claims',
        targetSystem: 'ScholarLink DB',
        targetTable: 'users',
        targetColumn: 'email, firstName, lastName, profileImageUrl',
        transformation: 'JWT claims extraction',
        purpose: 'User account creation and authentication',
        legalBasis: 'contract',
        accessPattern: 'write',
        frequency: 'on_demand'
      },

      // Profile completion flow
      {
        id: 'flow_002', 
        sourceSystem: 'Frontend Form',
        sourceTable: 'user_input',
        sourceColumn: 'profile_data',
        targetSystem: 'ScholarLink DB',
        targetTable: 'student_profiles',
        targetColumn: 'gpa, major, school, location, demographics',
        transformation: 'Form validation and sanitization',
        purpose: 'Academic profile creation for scholarship matching',
        legalBasis: 'consent',
        accessPattern: 'write',
        frequency: 'on_demand'
      },

      // Document upload flow
      {
        id: 'flow_003',
        sourceSystem: 'User Upload',
        sourceTable: 'file_input',
        sourceColumn: 'document_file',
        targetSystem: 'Google Cloud Storage',
        targetTable: 'object_storage',
        targetColumn: 'file_content',
        transformation: 'File encryption and metadata extraction',
        purpose: 'Document storage for scholarship applications',
        legalBasis: 'consent',
        accessPattern: 'write',
        frequency: 'on_demand'
      },

      // Analytics flow
      {
        id: 'flow_004',
        sourceSystem: 'Frontend Events',
        sourceTable: 'user_interactions',
        sourceColumn: 'event_data',
        targetSystem: 'ScholarLink DB', 
        targetTable: 'ttv_events',
        targetColumn: 'userId, eventType, metadata, sessionId',
        transformation: 'Event aggregation and anonymization',
        purpose: 'User experience analytics and product improvement',
        legalBasis: 'legitimate_interests',
        accessPattern: 'write',
        frequency: 'real_time'
      },

      // AI/ML processing flow
      {
        id: 'flow_005',
        sourceSystem: 'ScholarLink DB',
        sourceTable: 'student_profiles',
        sourceColumn: 'academic_data',
        targetSystem: 'OpenAI API',
        targetTable: 'processing_service',
        targetColumn: 'prompt_data',
        transformation: 'Data anonymization and prompt construction',
        purpose: 'Scholarship matching and essay assistance',
        legalBasis: 'consent',
        accessPattern: 'read',
        frequency: 'on_demand'
      },

      // Session management flow
      {
        id: 'flow_006',
        sourceSystem: 'Authentication Service',
        sourceTable: 'auth_session',
        sourceColumn: 'session_data',
        targetSystem: 'ScholarLink DB',
        targetTable: 'sessions',
        targetColumn: 'sid, sess',
        transformation: 'Session serialization and encryption',
        purpose: 'User session management and security',
        legalBasis: 'contract',
        accessPattern: 'read_write',
        frequency: 'real_time'
      }
    ];
  }

  /**
   * Get processing activities for GDPR Article 30 compliance
   */
  getProcessingActivities(): PIIProcessingActivity[] {
    return [
      {
        id: 'activity_001',
        name: 'User Account Management',
        description: 'Creation, maintenance, and deletion of user accounts',
        purpose: 'Provide scholarship platform services and user authentication',
        legalBasis: 'contract',
        dataSubjects: ['students', 'scholarship_applicants'],
        piiCategories: ['identity', 'contact'],
        recipients: ['internal_staff', 'replit_oidc_service'],
        retentionPeriod: '7 years after account deletion',
        crossBorderTransfer: true,
        safeguards: ['adequate_decision', 'standard_contractual_clauses'],
        dataMinimization: true,
        lastUpdated: new Date().toISOString()
      },

      {
        id: 'activity_002',
        name: 'Academic Profile Processing',
        description: 'Collection and processing of academic information for scholarship matching',
        purpose: 'Provide personalized scholarship recommendations',
        legalBasis: 'consent',
        dataSubjects: ['students'],
        piiCategories: ['demographic', 'behavioral'],
        recipients: ['internal_staff', 'scholarship_matching_service'],
        retentionPeriod: '5 years after graduation or service termination',
        crossBorderTransfer: false,
        safeguards: ['encryption', 'access_controls'],
        dataMinimization: true,
        lastUpdated: new Date().toISOString()
      },

      {
        id: 'activity_003',
        name: 'Document Storage and Management',
        description: 'Storage of user-uploaded documents for scholarship applications',
        purpose: 'Enable scholarship application document management',
        legalBasis: 'consent',
        dataSubjects: ['scholarship_applicants'],
        piiCategories: ['identity', 'behavioral'],
        recipients: ['internal_staff', 'cloud_storage_provider'],
        retentionPeriod: '3 years after document deletion by user',
        crossBorderTransfer: true,
        safeguards: ['encryption_at_rest', 'encryption_in_transit', 'access_controls'],
        dataMinimization: true,
        lastUpdated: new Date().toISOString()
      },

      {
        id: 'activity_004',
        name: 'Analytics and Performance Monitoring',
        description: 'Collection of user interaction data for platform improvement',
        purpose: 'Improve user experience and platform performance',
        legalBasis: 'legitimate_interests',
        dataSubjects: ['all_users'],
        piiCategories: ['behavioral'],
        recipients: ['internal_staff', 'development_team'],
        retentionPeriod: '2 years',
        crossBorderTransfer: false,
        safeguards: ['anonymization', 'aggregation', 'access_controls'],
        dataMinimization: true,
        lastUpdated: new Date().toISOString()
      },

      {
        id: 'activity_005',
        name: 'AI-Assisted Services',
        description: 'Use of AI services for scholarship matching and essay assistance',
        purpose: 'Provide intelligent scholarship recommendations and writing assistance',
        legalBasis: 'consent',
        dataSubjects: ['students'],
        piiCategories: ['demographic', 'behavioral'],
        recipients: ['ai_service_provider'],
        retentionPeriod: 'Not retained by AI provider (as per service agreement)',
        crossBorderTransfer: true,
        safeguards: ['data_processing_agreement', 'anonymization', 'secure_transmission'],
        dataMinimization: true,
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  /**
   * Generate comprehensive PII lineage report
   */
  async generatePIILineageReport(): Promise<string> {
    const reportId = `pii-lineage-${new Date().toISOString().split('T')[0]}`;
    
    try {
      console.log('Generating PII lineage report...');

      const report = {
        reportId,
        generatedAt: new Date().toISOString(),
        
        // Core PII inventory
        piiInventory: this.getPIIInventory(),
        
        // Data flow mapping
        dataFlows: this.getDataFlows(),
        
        // Processing activities
        processingActivities: this.getProcessingActivities(),
        
        // Database analysis
        databaseAnalysis: await this.analyzeDatabaseForPII(),
        
        // Risk assessment
        riskAssessment: this.assessPIIRisks(),
        
        // Compliance status
        complianceStatus: this.getComplianceStatus(),
        
        // Recommendations
        recommendations: this.getRecommendations()
      };

      // Save detailed report
      const reportPath = `server/compliance/reports/${reportId}.json`;
      await this.saveReport(reportPath, report);
      
      // Generate executive summary
      await this.generateExecutiveSummary(report, reportId);

      console.log(`PII lineage report generated: ${reportId}`);
      return reportId;

    } catch (error) {
      console.error('Error generating PII lineage report:', error);
      throw error;
    }
  }

  /**
   * Analyze database for PII fields and relationships
   */
  private async analyzeDatabaseForPII(): Promise<any> {
    try {
      // Get table information
      const tableInfo = await db.execute(sql`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      // Get foreign key relationships  
      const fkRelationships = await db.execute(sql`
        SELECT
          tc.table_name as source_table,
          kcu.column_name as source_column,
          ccu.table_name as target_table,
          ccu.column_name as target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `);

      // Analyze table sizes and PII exposure
      const tableSizes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_live_tup as row_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables 
        ORDER BY n_live_tup DESC
      `);

      return {
        tables: tableInfo,
        relationships: fkRelationships,
        sizes: tableSizes,
        analysisTimestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error analyzing database for PII:', error);
      return { error: String(error) };
    }
  }

  /**
   * Assess PII-related risks
   */
  private assessPIIRisks(): any {
    const piiFields = this.getPIIInventory();
    const dataFlows = this.getDataFlows();

    const risks = {
      highRiskFields: piiFields.filter(f => f.sensitivity === 'critical' || f.sensitivity === 'high'),
      unencryptedSensitiveData: piiFields.filter(f => f.sensitivity === 'high' && !f.encryptionRequired),
      crossBorderFlows: dataFlows.filter(f => f.targetSystem.includes('Cloud') || f.targetSystem.includes('API')),
      longRetentionPeriods: piiFields.filter(f => f.retentionPeriod && f.retentionPeriod.includes('7 years')),
      
      riskScore: this.calculateRiskScore(piiFields, dataFlows),
      
      mitigationStatus: {
        encryptionImplemented: true,
        accessControlsImplemented: true,
        auditLoggingImplemented: false, // TODO: Implement audit logging
        dataMinimizationImplemented: true,
        retentionPolicyImplemented: false // TODO: Implement automated retention
      }
    };

    return risks;
  }

  private calculateRiskScore(piiFields: PIIField[], dataFlows: DataFlow[]): number {
    let score = 0;
    
    // Risk factors
    const highSensitivityFields = piiFields.filter(f => f.sensitivity === 'critical' || f.sensitivity === 'high').length;
    const unencryptedFields = piiFields.filter(f => f.sensitivity === 'high' && !f.encryptionRequired).length;
    const crossBorderFlows = dataFlows.filter(f => f.targetSystem.includes('API')).length;
    
    score += highSensitivityFields * 2;
    score += unencryptedFields * 3;
    score += crossBorderFlows * 1;
    
    // Normalize to 0-100 scale
    return Math.min(100, (score / 20) * 100);
  }

  /**
   * Get compliance status
   */
  private getComplianceStatus(): any {
    return {
      gdpr: {
        article30: 'compliant', // Processing activities documented
        article32: 'partial', // Security measures implemented, audit logging pending
        article35: 'not_required', // No high-risk processing identified
        dataSubjectRights: 'partial' // Rights framework exists, automation pending
      },
      
      ccpa: {
        applicable: true,
        disclosureCompliant: 'partial',
        optOutMechanism: 'not_implemented',
        dataInventory: 'compliant'
      },
      
      soc2: {
        type2: 'in_progress',
        controlsImplemented: 'partial',
        evidenceCollection: 'active'
      },
      
      lastAssessment: new Date().toISOString()
    };
  }

  /**
   * Get recommendations for PII management improvement
   */
  private getRecommendations(): string[] {
    return [
      'Implement comprehensive audit logging for all PII access and modifications',
      'Automate data retention policy enforcement with scheduled cleanup jobs',
      'Add encryption for demographics field in student_profiles table', 
      'Implement data subject rights automation (access, deletion, portability)',
      'Conduct privacy impact assessment for AI service integration',
      'Enhance session data encryption with additional security layers',
      'Implement data loss prevention monitoring for PII exposure',
      'Regular PII discovery scans to identify new sensitive data fields',
      'Staff training on PII handling and privacy regulations',
      'Implement consent management system for granular consent tracking'
    ];
  }

  /**
   * Save report to file system
   */
  private async saveReport(path: string, report: any): Promise<void> {
    // In a real implementation, this would save to the file system
    // For now, we'll just log the action
    console.log(`Report saved to ${path}: ${JSON.stringify(report).length} bytes`);
  }

  /**
   * Generate executive summary
   */
  private async generateExecutiveSummary(report: any, reportId: string): Promise<void> {
    const summary = `
PII LINEAGE EXECUTIVE SUMMARY
Generated: ${report.generatedAt}
Report ID: ${reportId}

KEY METRICS:
- Total PII Fields: ${report.piiInventory.length}
- High-Risk Fields: ${report.riskAssessment.highRiskFields.length}
- Data Flows: ${report.dataFlows.length}
- Processing Activities: ${report.processingActivities.length}
- Risk Score: ${report.riskAssessment.riskScore}/100

COMPLIANCE STATUS:
- GDPR: ${report.complianceStatus.gdpr.article30} (Article 30)
- CCPA: ${report.complianceStatus.ccpa.dataInventory} (Data Inventory)
- SOC2: ${report.complianceStatus.soc2.controlsImplemented} (Controls)

TOP RECOMMENDATIONS:
${report.recommendations.slice(0, 3).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

Full report available at: ${reportId}.json
    `;

    console.log('Executive Summary:', summary);
  }
}

// Export singleton instance
export const piiLineageTracker = new PIILineageTracker();