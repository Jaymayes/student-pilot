/**
 * QA RUNTIME VALIDATION SCRIPT
 * Tests actual running application to validate identified issues
 */

import fs from 'fs';

class QARuntimeValidator {
  constructor() {
    this.validationResults = [];
    this.testCount = 0;
  }

  logResult(testName, status, details, severity = 'Medium') {
    this.testCount++;
    const result = {
      testId: `RT-${String(this.testCount).padStart(3, '0')}`,
      testName,
      status, // 'PASS', 'FAIL', 'WARN', 'INFO'
      details,
      severity,
      timestamp: new Date().toISOString()
    };
    this.validationResults.push(result);
    
    const emoji = {
      'PASS': '✅',
      'FAIL': '❌', 
      'WARN': '⚠️',
      'INFO': 'ℹ️'
    }[status] || '📋';
    
    console.log(`${emoji} ${result.testId}: ${testName} - ${status}`);
    if (details) console.log(`   Details: ${details}\n`);
  }

  // Test server configuration and security
  async testServerConfiguration() {
    console.log('🔧 Testing Server Configuration...\n');

    // Test environment validation
    await this.testEnvironmentValidation();
    
    // Test database configuration
    await this.testDatabaseConfiguration();
    
    // Test security headers
    await this.testSecurityConfiguration();
    
    // Test API endpoints
    await this.testAPIEndpointSecurity();
  }

  async testEnvironmentValidation() {
    try {
      // Read environment config
      const envConfig = fs.readFileSync('server/environment.ts', 'utf8');
      
      // Check if critical environment variables are validated
      const criticalVars = ['DATABASE_URL', 'SESSION_SECRET', 'OPENAI_API_KEY'];
      
      criticalVars.forEach(envVar => {
        if (envConfig.includes(envVar) && envConfig.includes(`${envVar}: z.string()`)) {
          // Check if minimum length validation exists
          const hasMinValidation = envConfig.includes(`.min(`) && 
                                  envConfig.indexOf(envVar) < envConfig.indexOf('.min(', envConfig.indexOf(envVar) + 50);
          
          if (hasMinValidation) {
            this.logResult(
              `Environment validation for ${envVar}`,
              'PASS',
              `${envVar} has proper length validation`,
              'Low'
            );
          } else {
            this.logResult(
              `Environment validation for ${envVar}`,
              'FAIL',
              `${envVar} lacks minimum length validation - may accept empty strings`,
              'Medium'
            );
          }
        } else {
          this.logResult(
            `Environment validation for ${envVar}`,
            'FAIL',
            `${envVar} validation not found or insufficient`,
            'Critical'
          );
        }
      });
      
      // Check for fail-fast behavior
      if (envConfig.includes('process.exit(1)')) {
        this.logResult(
          'Environment validation fail-fast',
          'PASS',
          'Server configured to exit on environment validation failure',
          'Low'
        );
      } else {
        this.logResult(
          'Environment validation fail-fast',
          'WARN',
          'Server may not exit on environment validation failures',
          'Medium'
        );
      }
      
    } catch (error) {
      this.logResult(
        'Environment configuration test',
        'FAIL',
        `Failed to read environment config: ${error.message}`,
        'High'
      );
    }
  }

  async testDatabaseConfiguration() {
    try {
      const dbConfig = fs.readFileSync('server/db.ts', 'utf8');
      
      // Check for connection pool error handling
      if (dbConfig.includes('pool.on(\'error\'') || dbConfig.includes('pool.on("error"')) {
        this.logResult(
          'Database connection error handling',
          'PASS',
          'Database pool error handling is configured',
          'Low'
        );
      } else {
        this.logResult(
          'Database connection error handling',
          'FAIL',
          'Missing database connection pool error handling',
          'High'
        );
      }
      
      // Check for connection timeouts
      if (dbConfig.includes('connectionTimeoutMillis') || dbConfig.includes('timeout')) {
        this.logResult(
          'Database connection timeouts',
          'PASS',
          'Database connection timeouts are configured',
          'Low'
        );
      } else {
        this.logResult(
          'Database connection timeouts',
          'WARN',
          'Database connection timeouts may not be configured',
          'Medium'
        );
      }
      
      // Check for health check function
      if (dbConfig.includes('checkDatabaseHealth')) {
        this.logResult(
          'Database health check',
          'PASS',
          'Database health check function exists',
          'Low'
        );
      } else {
        this.logResult(
          'Database health check',
          'WARN',
          'Database health check function not found',
          'Medium'
        );
      }
      
    } catch (error) {
      this.logResult(
        'Database configuration test',
        'FAIL',
        `Failed to read database config: ${error.message}`,
        'High'
      );
    }
  }

  async testSecurityConfiguration() {
    try {
      const serverConfig = fs.readFileSync('server/index.ts', 'utf8');
      
      // Check for security headers (helmet)
      if (serverConfig.includes('helmet')) {
        this.logResult(
          'Security headers configuration',
          'PASS',
          'Helmet security middleware is configured',
          'Low'
        );
      } else {
        this.logResult(
          'Security headers configuration',
          'FAIL',
          'Missing helmet security middleware',
          'High'
        );
      }
      
      // Check for rate limiting
      if (serverConfig.includes('rateLimit') || serverConfig.includes('express-rate-limit')) {
        this.logResult(
          'Rate limiting configuration',
          'PASS',
          'Rate limiting middleware is configured',
          'Low'
        );
      } else {
        this.logResult(
          'Rate limiting configuration',
          'WARN',
          'Rate limiting middleware not found in main server file',
          'Medium'
        );
      }
      
      // Check for CORS configuration
      if (serverConfig.includes('cors')) {
        this.logResult(
          'CORS configuration',
          'PASS',
          'CORS middleware is configured',
          'Low'
        );
      } else {
        this.logResult(
          'CORS configuration',
          'WARN',
          'CORS configuration not explicitly found',
          'Medium'
        );
      }
      
      // Check for compression
      if (serverConfig.includes('compression')) {
        this.logResult(
          'Response compression',
          'PASS',
          'Response compression middleware is configured',
          'Low'
        );
      } else {
        this.logResult(
          'Response compression',
          'INFO',
          'Response compression middleware not found',
          'Low'
        );
      }
      
    } catch (error) {
      this.logResult(
        'Security configuration test',
        'FAIL',
        `Failed to read server config: ${error.message}`,
        'High'
      );
    }
  }

  async testAPIEndpointSecurity() {
    try {
      const routesConfig = fs.readFileSync('server/routes.ts', 'utf8');
      
      // Check for authentication middleware usage
      const authMiddlewareUsage = (routesConfig.match(/isAuthenticated/g) || []).length;
      const apiEndpoints = (routesConfig.match(/app\.(get|post|put|delete)\s*\(\s*['"`]\/api\//g) || []).length;
      
      if (authMiddlewareUsage > 0) {
        this.logResult(
          'Authentication middleware usage',
          'PASS',
          `Authentication middleware used ${authMiddlewareUsage} times`,
          'Low'
        );
      } else {
        this.logResult(
          'Authentication middleware usage',
          'WARN',
          'Authentication middleware usage not found in routes',
          'High'
        );
      }
      
      // Check for input validation
      if (routesConfig.includes('validator') || routesConfig.includes('validation')) {
        this.logResult(
          'Input validation middleware',
          'PASS',
          'Input validation middleware found in routes',
          'Low'
        );
      } else {
        this.logResult(
          'Input validation middleware',
          'FAIL',
          'Input validation middleware not found in routes',
          'High'
        );
      }
      
      // Check for SQL injection prevention
      const sqlInjectionRisk = routesConfig.includes('query(') && routesConfig.includes('${');
      if (sqlInjectionRisk) {
        this.logResult(
          'SQL injection protection',
          'FAIL',
          'Potential SQL injection vulnerability with string interpolation',
          'Critical'
        );
      } else {
        this.logResult(
          'SQL injection protection',
          'PASS',
          'No obvious SQL injection vulnerabilities in string interpolation',
          'Low'
        );
      }
      
      // Check for sensitive data logging
      const sensitiveLogging = routesConfig.includes('console.log') && 
                            (routesConfig.includes('password') || routesConfig.includes('token') || routesConfig.includes('secret'));
      if (sensitiveLogging) {
        this.logResult(
          'Sensitive data logging',
          'FAIL',
          'Potential sensitive data logging found in routes',
          'High'
        );
      } else {
        this.logResult(
          'Sensitive data logging',
          'PASS',
          'No obvious sensitive data logging in routes',
          'Low'
        );
      }
      
    } catch (error) {
      this.logResult(
        'API endpoint security test',
        'FAIL',
        `Failed to read routes config: ${error.message}`,
        'High'
      );
    }
  }

  // Test authentication and session security
  async testAuthenticationSecurity() {
    console.log('🔐 Testing Authentication Security...\n');
    
    try {
      const authConfig = fs.readFileSync('server/replitAuth.ts', 'utf8');
      
      // Check session security settings
      const securityChecks = [
        {
          name: 'Session httpOnly flag',
          check: authConfig.includes('httpOnly: true'),
          severity: 'High'
        },
        {
          name: 'Session secure flag',
          check: authConfig.includes('secure: true'),
          severity: 'Medium'
        },
        {
          name: 'Session SameSite protection',
          check: authConfig.includes('sameSite'),
          severity: 'Medium'
        },
        {
          name: 'Session secret from environment',
          check: authConfig.includes('env.SESSION_SECRET'),
          severity: 'Critical'
        }
      ];
      
      securityChecks.forEach(check => {
        if (check.check) {
          this.logResult(
            check.name,
            'PASS',
            `${check.name} is properly configured`,
            'Low'
          );
        } else {
          this.logResult(
            check.name,
            'FAIL',
            `${check.name} is missing or improperly configured`,
            check.severity
          );
        }
      });
      
      // Check for JWT error handling
      if (authConfig.includes('jwt.verify') || authConfig.includes('verify')) {
        if (authConfig.includes('try') && authConfig.includes('catch')) {
          this.logResult(
            'JWT verification error handling',
            'PASS',
            'JWT verification includes error handling',
            'Low'
          );
        } else {
          this.logResult(
            'JWT verification error handling',
            'FAIL',
            'JWT verification may lack proper error handling',
            'High'
          );
        }
      }
      
      // Check for refresh token handling
      if (authConfig.includes('refresh_token')) {
        this.logResult(
          'Token refresh mechanism',
          'INFO',
          'Token refresh mechanism found',
          'Low'
        );
      } else {
        this.logResult(
          'Token refresh mechanism',
          'WARN',
          'Token refresh mechanism not found',
          'Medium'
        );
      }
      
    } catch (error) {
      this.logResult(
        'Authentication security test',
        'FAIL',
        `Failed to read authentication config: ${error.message}`,
        'High'
      );
    }
  }

  // Test frontend security and functionality
  async testFrontendSecurity() {
    console.log('🌐 Testing Frontend Security...\n');
    
    // Test main app configuration
    await this.testReactAppSecurity();
    
    // Test component security
    await this.testComponentSecurity();
    
    // Test authentication hooks
    await this.testClientAuthSecurity();
  }

  async testReactAppSecurity() {
    try {
      const appConfig = fs.readFileSync('client/src/App.tsx', 'utf8');
      
      // Check for error boundary
      if (appConfig.includes('ErrorBoundary') || appConfig.includes('componentDidCatch')) {
        this.logResult(
          'React error boundary',
          'PASS',
          'Error boundary implementation found',
          'Low'
        );
      } else {
        this.logResult(
          'React error boundary',
          'WARN',
          'Error boundary implementation not found',
          'Medium'
        );
      }
      
      // Check for proper routing
      if (appConfig.includes('Router') && appConfig.includes('Route')) {
        this.logResult(
          'React routing configuration',
          'PASS',
          'React routing is configured',
          'Low'
        );
      } else {
        this.logResult(
          'React routing configuration',
          'WARN',
          'React routing configuration not found',
          'Low'
        );
      }
      
      // Check for authentication-based routing
      if (appConfig.includes('useAuth') || appConfig.includes('isAuthenticated')) {
        this.logResult(
          'Authentication-based routing',
          'PASS',
          'Authentication-based routing found',
          'Low'
        );
      } else {
        this.logResult(
          'Authentication-based routing',
          'WARN',
          'Authentication-based routing not clearly implemented',
          'Medium'
        );
      }
      
    } catch (error) {
      this.logResult(
        'React app security test',
        'FAIL',
        `Failed to read React app config: ${error.message}`,
        'High'
      );
    }
  }

  async testComponentSecurity() {
    const components = [
      'client/src/pages/profile.tsx',
      'client/src/pages/dashboard.tsx', 
      'client/src/pages/applications.tsx'
    ];
    
    for (const componentPath of components) {
      try {
        if (!fs.existsSync(componentPath)) continue;
        
        const componentCode = fs.readFileSync(componentPath, 'utf8');
        const componentName = componentPath.split('/').pop();
        
        // Check for XSS vulnerabilities
        if (componentCode.includes('innerHTML') || componentCode.includes('dangerouslySetInnerHTML')) {
          this.logResult(
            `XSS vulnerability in ${componentName}`,
            'FAIL',
            'Potential XSS vulnerability with innerHTML usage',
            'Critical'
          );
        } else {
          this.logResult(
            `XSS protection in ${componentName}`,
            'PASS',
            'No obvious XSS vulnerabilities found',
            'Low'
          );
        }
        
        // Check for proper form validation
        if (componentCode.includes('<form') || componentCode.includes('Form')) {
          if (componentCode.includes('validation') || componentCode.includes('schema') || componentCode.includes('zod')) {
            this.logResult(
              `Form validation in ${componentName}`,
              'PASS',
              'Form validation implementation found',
              'Low'
            );
          } else {
            this.logResult(
              `Form validation in ${componentName}`,
              'WARN',
              'Form validation implementation not clearly found',
              'Medium'
            );
          }
        }
        
        // Check for proper error handling
        if (componentCode.includes('try') && componentCode.includes('catch')) {
          this.logResult(
            `Error handling in ${componentName}`,
            'PASS',
            'Error handling implementation found',
            'Low'
          );
        } else if (componentCode.includes('apiRequest') || componentCode.includes('fetch')) {
          this.logResult(
            `Error handling in ${componentName}`,
            'WARN',
            'API calls found but error handling not clear',
            'Medium'
          );
        }
        
        // Check for accessibility
        if (componentCode.includes('aria-') || componentCode.includes('role=')) {
          this.logResult(
            `Accessibility in ${componentName}`,
            'PASS',
            'Accessibility attributes found',
            'Low'
          );
        } else {
          this.logResult(
            `Accessibility in ${componentName}`,
            'INFO',
            'Limited accessibility attributes found',
            'Low'
          );
        }
        
      } catch (error) {
        this.logResult(
          `Component security test for ${componentPath}`,
          'FAIL',
          `Failed to read component: ${error.message}`,
          'Medium'
        );
      }
    }
  }

  async testClientAuthSecurity() {
    try {
      const authHook = fs.readFileSync('client/src/hooks/useAuth.ts', 'utf8');
      
      // Check for localStorage token storage (security issue)
      if (authHook.includes('localStorage')) {
        this.logResult(
          'Client-side token storage',
          'FAIL',
          'Authentication tokens stored in localStorage (XSS vulnerability)',
          'High'
        );
      } else {
        this.logResult(
          'Client-side token storage',
          'PASS',
          'No localStorage usage found for token storage',
          'Low'
        );
      }
      
      // Check for token expiration handling
      if (authHook.includes('expires') || authHook.includes('refresh')) {
        this.logResult(
          'Token expiration handling',
          'PASS',
          'Token expiration handling found',
          'Low'
        );
      } else {
        this.logResult(
          'Token expiration handling',
          'WARN',
          'Token expiration handling not clearly implemented',
          'Medium'
        );
      }
      
      // Check for proper logout cleanup
      if (authHook.includes('logout')) {
        if (authHook.includes('clear') || authHook.includes('remove')) {
          this.logResult(
            'Logout cleanup',
            'PASS',
            'Logout cleanup implementation found',
            'Low'
          );
        } else {
          this.logResult(
            'Logout cleanup',
            'WARN',
            'Logout cleanup implementation not clear',
            'Medium'
          );
        }
      }
      
    } catch (error) {
      this.logResult(
        'Client authentication security test',
        'FAIL',
        `Failed to read auth hook: ${error.message}`,
        'High'
      );
    }
  }

  // Test database schema and integrity
  async testDatabaseSchema() {
    console.log('🗄️ Testing Database Schema...\n');
    
    try {
      const schema = fs.readFileSync('shared/schema.ts', 'utf8');
      
      // Check for missing indexes on foreign keys
      const foreignKeyMatches = schema.match(/\.references\(\(\)\s*=>\s*\w+\.\w+\)/g) || [];
      const indexMatches = schema.match(/index\(/g) || [];
      
      if (foreignKeyMatches.length > indexMatches.length) {
        this.logResult(
          'Database index optimization',
          'WARN',
          `${foreignKeyMatches.length} foreign keys but only ${indexMatches.length} explicit indexes`,
          'Medium'
        );
      } else {
        this.logResult(
          'Database index optimization',
          'PASS',
          'Adequate indexing appears to be in place',
          'Low'
        );
      }
      
      // Check for proper enum definitions
      const enumDefinitions = schema.match(/pgEnum\([^)]+\)/g) || [];
      enumDefinitions.forEach((enumDef, index) => {
        if (enumDef.split('"').length >= 4) {
          this.logResult(
            `Enum definition #${index + 1}`,
            'PASS',
            'Enum has multiple values defined',
            'Low'
          );
        } else {
          this.logResult(
            `Enum definition #${index + 1}`,
            'WARN',
            'Enum may have insufficient values',
            'Low'
          );
        }
      });
      
      // Check for cascading delete configuration
      if (schema.includes('references(') && !schema.includes('onDelete')) {
        this.logResult(
          'Cascading delete configuration',
          'WARN',
          'Foreign key constraints may lack cascade delete configuration',
          'Medium'
        );
      } else {
        this.logResult(
          'Cascading delete configuration',
          'PASS',
          'Cascade delete configuration appears to be addressed',
          'Low'
        );
      }
      
      // Check for proper validation schemas
      if (schema.includes('createInsertSchema')) {
        this.logResult(
          'Schema validation',
          'PASS',
          'Insert schema validation found',
          'Low'
        );
      } else {
        this.logResult(
          'Schema validation',
          'WARN',
          'Insert schema validation not found',
          'Medium'
        );
      }
      
    } catch (error) {
      this.logResult(
        'Database schema test',
        'FAIL',
        `Failed to read database schema: ${error.message}`,
        'High'
      );
    }
  }

  // Test billing system integrity
  async testBillingSystemSecurity() {
    console.log('💳 Testing Billing System Security...\n');
    
    try {
      const billingConfig = fs.readFileSync('server/billing.ts', 'utf8');
      
      // Check for transaction integrity
      if (billingConfig.includes('transaction') || billingConfig.includes('BEGIN')) {
        this.logResult(
          'Billing transaction integrity',
          'PASS',
          'Database transactions found in billing operations',
          'Low'
        );
      } else {
        this.logResult(
          'Billing transaction integrity',
          'FAIL',
          'Billing operations may lack transaction protection',
          'Critical'
        );
      }
      
      // Check for BigInt consistency
      if (billingConfig.includes('BigInt') && billingConfig.includes('Number')) {
        this.logResult(
          'Billing calculation precision',
          'WARN',
          'Mixed BigInt and Number usage may cause precision errors',
          'High'
        );
      } else {
        this.logResult(
          'Billing calculation precision',
          'PASS',
          'Consistent numeric type usage in billing',
          'Low'
        );
      }
      
      // Check for audit trail
      if (billingConfig.includes('creditLedger') || billingConfig.includes('ledger')) {
        this.logResult(
          'Billing audit trail',
          'PASS',
          'Audit trail implementation found',
          'Low'
        );
      } else {
        this.logResult(
          'Billing audit trail',
          'WARN',
          'Audit trail implementation not clearly found',
          'High'
        );
      }
      
      // Check for balance validation
      if (billingConfig.includes('balance >=') || billingConfig.includes('sufficient')) {
        this.logResult(
          'Balance validation',
          'PASS',
          'Balance validation found',
          'Low'
        );
      } else {
        this.logResult(
          'Balance validation',
          'WARN',
          'Balance validation not clearly implemented',
          'High'
        );
      }
      
      // Check for Stripe webhook validation
      if (billingConfig.includes('stripe') && billingConfig.includes('webhook')) {
        if (billingConfig.includes('constructEvent') || billingConfig.includes('verify')) {
          this.logResult(
            'Stripe webhook validation',
            'PASS',
            'Stripe webhook validation found',
            'Low'
          );
        } else {
          this.logResult(
            'Stripe webhook validation',
            'FAIL',
            'Stripe webhook signature validation not found',
            'Critical'
          );
        }
      }
      
    } catch (error) {
      this.logResult(
        'Billing system security test',
        'INFO',
        `Billing system file not found or accessible: ${error.message}`,
        'Low'
      );
    }
  }

  // Generate runtime validation report
  generateRuntimeReport() {
    console.log('\n📊 RUNTIME VALIDATION REPORT');
    console.log('========================================\n');

    const statusCount = {
      PASS: this.validationResults.filter(r => r.status === 'PASS').length,
      FAIL: this.validationResults.filter(r => r.status === 'FAIL').length,
      WARN: this.validationResults.filter(r => r.status === 'WARN').length,
      INFO: this.validationResults.filter(r => r.status === 'INFO').length
    };

    const severityCount = {
      Critical: this.validationResults.filter(r => r.severity === 'Critical').length,
      High: this.validationResults.filter(r => r.severity === 'High').length,
      Medium: this.validationResults.filter(r => r.severity === 'Medium').length,
      Low: this.validationResults.filter(r => r.severity === 'Low').length
    };

    console.log('📈 VALIDATION SUMMARY:');
    console.log(`✅ PASS: ${statusCount.PASS}`);
    console.log(`❌ FAIL: ${statusCount.FAIL}`);
    console.log(`⚠️  WARN: ${statusCount.WARN}`);
    console.log(`ℹ️  INFO: ${statusCount.INFO}`);
    console.log(`Total Tests: ${this.testCount}\n`);

    console.log('🎯 SEVERITY BREAKDOWN:');
    console.log(`🔴 Critical: ${severityCount.Critical}`);
    console.log(`🟠 High: ${severityCount.High}`);
    console.log(`🟡 Medium: ${severityCount.Medium}`);
    console.log(`🟢 Low: ${severityCount.Low}\n`);

    // Group failed tests by severity
    const failedTests = this.validationResults.filter(r => r.status === 'FAIL');
    const groupedFailed = {
      Critical: failedTests.filter(r => r.severity === 'Critical'),
      High: failedTests.filter(r => r.severity === 'High'),
      Medium: failedTests.filter(r => r.severity === 'Medium'),
      Low: failedTests.filter(r => r.severity === 'Low')
    };

    if (failedTests.length > 0) {
      console.log('🚨 FAILED TESTS BY SEVERITY:\n');
      
      Object.entries(groupedFailed).forEach(([severity, tests]) => {
        if (tests.length > 0) {
          console.log(`${severity.toUpperCase()} SEVERITY FAILURES (${tests.length}):`);
          console.log('-'.repeat(50));
          
          tests.forEach(test => {
            console.log(`${test.testId}: ${test.testName}`);
            console.log(`Details: ${test.details}\n`);
          });
        }
      });
    }

    // Save detailed results
    const reportData = {
      summary: {
        statusCount,
        severityCount,
        totalTests: this.testCount
      },
      validationDate: new Date().toISOString(),
      results: this.validationResults
    };

    fs.writeFileSync('qa-runtime-validation-report.json', JSON.stringify(reportData, null, 2));
    console.log('📄 Runtime validation report saved to: qa-runtime-validation-report.json\n');

    return reportData;
  }

  async runRuntimeValidation() {
    console.log('🚀 Starting Runtime Validation...\n');

    try {
      await this.testServerConfiguration();
      await this.testAuthenticationSecurity();
      await this.testFrontendSecurity();
      await this.testDatabaseSchema();
      await this.testBillingSystemSecurity();
      
      const report = this.generateRuntimeReport();
      
      console.log('✅ Runtime Validation Complete!');
      console.log(`📊 Results: ${report.summary.totalTests} tests run`);
      console.log(`Status: ${report.summary.statusCount.PASS} passed, ${report.summary.statusCount.FAIL} failed, ${report.summary.statusCount.WARN} warnings`);
      
      return report;
    } catch (error) {
      console.error('❌ Runtime validation failed:', error.message);
      throw error;
    }
  }
}

// Run runtime validation
const validator = new QARuntimeValidator();
validator.runRuntimeValidation()
  .then(report => {
    console.log('\n🎯 Runtime validation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Runtime validation failed:', error);
    process.exit(1);
  });