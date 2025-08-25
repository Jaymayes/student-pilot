#!/usr/bin/env node

/**
 * QA COMPREHENSIVE TEST EXECUTION SUITE
 * 
 * Senior QA Engineer Analysis - Comprehensive Testing Framework
 * This suite identifies bugs, errors, and vulnerabilities without modifying code
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test results tracking
const testResults = {
  unitTests: [],
  integrationTests: [],
  securityTests: [],
  edgeCaseTests: [],
  configurationTests: [],
  databaseTests: [],
  businessLogicTests: [],
  performanceTests: []
};

let issueCounter = 1;

// Issue reporting utility
function reportIssue(category, location, description, severity, reproductionSteps, observedOutput, expectedOutput) {
  const issue = {
    issueId: `QA-${String(issueCounter).padStart(3, '0')}`,
    category,
    location,
    description,
    severity,
    reproductionSteps,
    observedOutput,
    expectedOutput,
    timestamp: new Date().toISOString()
  };
  
  testResults[category].push(issue);
  issueCounter++;
  
  console.log(`🚨 [${issue.severity}] ${issue.issueId}: ${description}`);
  console.log(`   Location: ${location}`);
  console.log(`   Steps to reproduce: ${reproductionSteps}`);
  console.log(`   Observed: ${observedOutput}`);
  console.log(`   Expected: ${expectedOutput}\n`);
  
  return issue;
}

// 1. CONFIGURATION AND ENVIRONMENT TESTS
async function runConfigurationTests() {
  console.log('\n=== CONFIGURATION ANALYSIS ===\n');
  
  try {
    // Test 1.1: Environment variable validation
    const envFile = await fs.readFile('.env', 'utf8').catch(() => null);
    if (!envFile) {
      reportIssue('configurationTests', '.env file', 
        'Missing .env file for development environment',
        'Medium', 
        '1. Start application in development mode', 
        'No .env file present', 
        'Should have .env file with required environment variables');
    }

    // Test 1.2: Package.json integrity
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    
    // Check for dependency vulnerabilities
    try {
      const npmAudit = await execAsync('npm audit --json');
      const auditResult = JSON.parse(npmAudit.stdout);
      
      if (auditResult.metadata.vulnerabilities.total > 0) {
        reportIssue('configurationTests', 'package.json dependencies',
          `Found ${auditResult.metadata.vulnerabilities.total} dependency vulnerabilities`,
          'High',
          '1. Run "npm audit" command',
          `${auditResult.metadata.vulnerabilities.high} high, ${auditResult.metadata.vulnerabilities.moderate} moderate, ${auditResult.metadata.vulnerabilities.low} low severity vulnerabilities`,
          'All dependencies should be free of known vulnerabilities');
      }
    } catch (auditError) {
      console.log('⚠️  npm audit failed, continuing with other tests...');
    }

    // Test 1.3: TypeScript configuration
    const tsConfig = JSON.parse(await fs.readFile('tsconfig.json', 'utf8'));
    if (!tsConfig.compilerOptions.strict) {
      reportIssue('configurationTests', 'tsconfig.json:compilerOptions.strict',
        'TypeScript strict mode not enabled',
        'Medium',
        '1. Check tsconfig.json compilerOptions',
        'strict: false or missing',
        'strict: true for better type safety');
    }

  } catch (error) {
    reportIssue('configurationTests', 'Configuration files',
      'Failed to analyze configuration files',
      'High',
      '1. Check configuration file accessibility',
      error.message,
      'Configuration files should be readable and valid');
  }
}

// 2. SECURITY ANALYSIS TESTS
async function runSecurityTests() {
  console.log('\n=== SECURITY ANALYSIS ===\n');
  
  try {
    // Test 2.1: Hardcoded secrets detection
    const files = await getAllSourceFiles();
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for potential hardcoded secrets
        const secretPatterns = [
          /(?:secret|key|token|password)\s*[:=]\s*['"][^'"]{20,}['"]/i,
          /sk_[a-zA-Z0-9]{24,}/g, // Stripe secret keys
          /pk_[a-zA-Z0-9]{24,}/g, // Stripe public keys
          /AKIA[0-9A-Z]{16}/g, // AWS access keys
        ];
        
        secretPatterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            reportIssue('securityTests', file,
              'Potential hardcoded secret detected',
              'Critical',
              `1. Search file for pattern: ${pattern.toString()}`,
              `Found potential secret: ${matches[0].substring(0, 20)}...`,
              'Secrets should be stored in environment variables');
          }
        });

        // Test 2.2: SQL injection patterns
        if (content.includes('${') && content.includes('db.')) {
          const templateLiterals = content.match(/\$\{[^}]*\}/g);
          if (templateLiterals && templateLiterals.some(tl => tl.includes('req.'))) {
            reportIssue('securityTests', file,
              'Potential SQL injection vulnerability with template literals',
              'High',
              '1. Search for template literals with req. parameters in SQL queries',
              'Found template literal with request parameter in DB query',
              'Use parameterized queries or proper escaping');
          }
        }

        // Test 2.3: Eval usage detection
        if (content.includes('eval(')) {
          reportIssue('securityTests', file,
            'Dangerous eval() usage detected',
            'Critical',
            '1. Search file for eval() calls',
            'Found eval() function call',
            'Avoid eval() - use JSON.parse() or other safe alternatives');
        }

      } catch (fileError) {
        // File read error, skip
        continue;
      }
    }

    // Test 2.4: Check CORS configuration
    const indexFile = await fs.readFile('server/index.ts', 'utf8');
    if (!indexFile.includes('cors') && indexFile.includes('app.use')) {
      reportIssue('securityTests', 'server/index.ts',
        'Missing CORS configuration',
        'Medium',
        '1. Check server/index.ts for CORS middleware',
        'No CORS configuration found',
        'Should implement proper CORS policy');
    }

  } catch (error) {
    reportIssue('securityTests', 'Security analysis',
      'Failed to complete security analysis',
      'High',
      '1. Check file system permissions and file accessibility',
      error.message,
      'Security analysis should complete successfully');
  }
}

// 3. API ENDPOINT TESTS
async function runIntegrationTests() {
  console.log('\n=== API ENDPOINT INTEGRATION TESTS ===\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Test 3.1: Authentication endpoints
  await testEndpoint('GET', '/api/auth/user', null, {
    expectedStatus: [401, 200],
    description: 'Auth user endpoint should handle unauthenticated requests',
    category: 'integrationTests'
  });

  // Test 3.2: API endpoints without authentication
  const publicEndpoints = [
    '/api/scholarships',
    '/sitemap.xml',
    '/scholarships'
  ];

  for (const endpoint of publicEndpoints) {
    await testEndpoint('GET', endpoint, null, {
      expectedStatus: [200, 404],
      description: `Public endpoint ${endpoint} should be accessible`,
      category: 'integrationTests'
    });
  }

  // Test 3.3: Protected endpoints (should return 401)
  const protectedEndpoints = [
    '/api/profile',
    '/api/applications',
    '/api/matches',
    '/api/documents',
    '/api/essays',
    '/api/billing/balance'
  ];

  for (const endpoint of protectedEndpoints) {
    await testEndpoint('GET', endpoint, null, {
      expectedStatus: [401],
      description: `Protected endpoint ${endpoint} should require authentication`,
      category: 'integrationTests'
    });
  }

  // Test 3.4: POST endpoints with invalid data
  const postEndpoints = [
    { path: '/api/profile', data: { invalidField: 'test' } },
    { path: '/api/applications', data: {} },
    { path: '/api/essays', data: { title: '' } }
  ];

  for (const { path, data } of postEndpoints) {
    await testEndpoint('POST', path, data, {
      expectedStatus: [400, 401],
      description: `POST ${path} should validate input data`,
      category: 'integrationTests'
    });
  }
}

// 4. EDGE CASE AND INPUT VALIDATION TESTS
async function runEdgeCaseTests() {
  console.log('\n=== EDGE CASE ANALYSIS ===\n');
  
  // Test 4.1: Large payload handling
  await testEndpoint('POST', '/api/profile', {
    firstName: 'A'.repeat(10000),
    lastName: 'B'.repeat(10000),
    email: 'test@example.com'
  }, {
    expectedStatus: [400, 413],
    description: 'Should handle excessively large input data',
    category: 'edgeCaseTests'
  });

  // Test 4.2: Special characters in input
  const specialCharInputs = [
    { field: 'email', value: '<script>alert("xss")</script>@example.com' },
    { field: 'firstName', value: '\'DROP TABLE users;--' },
    { field: 'lastName', value: '../../../../etc/passwd' },
    { field: 'major', value: '${process.env.SECRET_KEY}' }
  ];

  for (const { field, value } of specialCharInputs) {
    await testEndpoint('POST', '/api/profile', {
      [field]: value,
      email: 'test@example.com'
    }, {
      expectedStatus: [400, 401],
      description: `Should sanitize special characters in ${field}`,
      category: 'edgeCaseTests'
    });
  }

  // Test 4.3: Unicode and encoding tests
  await testEndpoint('POST', '/api/profile', {
    firstName: '测试用户',
    lastName: 'محمد عبدالله',
    email: 'test@тест.com'
  }, {
    expectedStatus: [400, 401, 200],
    description: 'Should handle Unicode characters properly',
    category: 'edgeCaseTests'
  });

  // Test 4.4: Boundary value testing
  await testEndpoint('GET', '/api/scholarships?page=' + Number.MAX_SAFE_INTEGER, null, {
    expectedStatus: [400, 200],
    description: 'Should handle maximum integer values',
    category: 'edgeCaseTests'
  });

  await testEndpoint('GET', '/api/scholarships?limit=-1', null, {
    expectedStatus: [400],
    description: 'Should reject negative values for limit parameter',
    category: 'edgeCaseTests'
  });
}

// 5. DATABASE OPERATION TESTS
async function runDatabaseTests() {
  console.log('\n=== DATABASE OPERATION ANALYSIS ===\n');
  
  try {
    // Test 5.1: Check database connection
    const dbFile = await fs.readFile('server/db.ts', 'utf8');
    
    // Test 5.2: Look for potential connection issues
    if (dbFile.includes('process.env.DATABASE_URL') && !dbFile.includes('throw')) {
      reportIssue('databaseTests', 'server/db.ts',
        'Missing database URL validation',
        'Medium',
        '1. Check server/db.ts for DATABASE_URL validation',
        'No explicit error handling for missing DATABASE_URL',
        'Should throw error if DATABASE_URL is not provided');
    }

    // Test 5.3: Check for proper transaction handling
    const storageFile = await fs.readFile('server/storage.ts', 'utf8');
    
    // Look for database operations that might need transactions
    const transactionNeeded = [
      'insert(',
      'update(',
      'delete('
    ];

    let hasTransactionUsage = storageFile.includes('db.transaction') || storageFile.includes('tx.');
    let hasModifyingOps = transactionNeeded.some(op => storageFile.includes(op));

    if (hasModifyingOps && !hasTransactionUsage) {
      reportIssue('databaseTests', 'server/storage.ts',
        'Database operations may need transaction support',
        'Medium',
        '1. Review storage.ts for database modifications without transactions',
        'Found insert/update/delete operations without transaction handling',
        'Complex operations should use database transactions for consistency');
    }

    // Test 5.4: Check for SQL injection protection
    if (storageFile.includes('${') && storageFile.includes('where(')) {
      reportIssue('databaseTests', 'server/storage.ts',
        'Potential SQL injection vulnerability in database queries',
        'High',
        '1. Search storage.ts for template literals in where clauses',
        'Found template literal usage in database where conditions',
        'Use parameterized queries with Drizzle ORM methods');
    }

  } catch (error) {
    reportIssue('databaseTests', 'Database analysis',
      'Failed to analyze database implementation',
      'High',
      '1. Check database files accessibility',
      error.message,
      'Database analysis should complete successfully');
  }
}

// 6. BUSINESS LOGIC TESTS
async function runBusinessLogicTests() {
  console.log('\n=== BUSINESS LOGIC ANALYSIS ===\n');
  
  try {
    // Test 6.1: Billing calculation accuracy
    const billingFile = await fs.readFile('server/billing.ts', 'utf8');
    
    // Check for floating point arithmetic in billing
    if (billingFile.includes('parseFloat') || billingFile.includes('Math.round')) {
      const floatMatches = billingFile.match(/parseFloat|Math\.round/g);
      if (floatMatches) {
        reportIssue('businessLogicTests', 'server/billing.ts',
          'Floating point arithmetic in billing calculations',
          'High',
          '1. Search billing.ts for parseFloat or Math.round usage',
          `Found ${floatMatches.length} instances of floating point operations`,
          'Use BigInt or fixed-point arithmetic for precise financial calculations');
      }
    }

    // Test 6.2: Credit calculation boundaries
    if (billingFile.includes('CREDITS_PER_DOLLAR') && billingFile.includes('MILLICREDITS_PER_CREDIT')) {
      // This is good - using constants for calculations
    } else {
      reportIssue('businessLogicTests', 'server/billing.ts',
        'Missing billing constants definition',
        'Medium',
        '1. Check billing.ts for credit conversion constants',
        'Constants not found or not properly defined',
        'Should use well-defined constants for credit calculations');
    }

    // Test 6.3: OpenAI usage billing
    const openaiFile = await fs.readFile('server/openai.ts', 'utf8');
    
    if (openaiFile.includes('billingService') && openaiFile.includes('chargeForUsage')) {
      // Good - has billing integration
    } else {
      reportIssue('businessLogicTests', 'server/openai.ts',
        'OpenAI usage not integrated with billing system',
        'Critical',
        '1. Check openai.ts for billing integration',
        'No billing service integration found',
        'OpenAI API calls should be tracked and billed to user accounts');
    }

    // Test 6.4: Error handling in critical business logic
    const criticalFiles = ['server/billing.ts', 'server/openai.ts', 'server/storage.ts'];
    
    for (const file of criticalFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for try-catch blocks
      const tryBlocks = (content.match(/try\s*{/g) || []).length;
      const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
      const asyncFunctions = (content.match(/async\s+\w+/g) || []).length;
      
      if (asyncFunctions > 0 && tryBlocks === 0) {
        reportIssue('businessLogicTests', file,
          'Missing error handling in async functions',
          'High',
          `1. Review ${file} for async functions without try-catch`,
          `Found ${asyncFunctions} async functions with ${tryBlocks} try blocks`,
          'All async functions should have proper error handling');
      }
    }

  } catch (error) {
    reportIssue('businessLogicTests', 'Business logic analysis',
      'Failed to analyze business logic implementation',
      'High',
      '1. Check business logic files accessibility',
      error.message,
      'Business logic analysis should complete successfully');
  }
}

// 7. UNIT TESTS FOR KEY FUNCTIONS
async function runUnitTests() {
  console.log('\n=== UNIT TEST ANALYSIS ===\n');
  
  try {
    // Test 7.1: Authentication functions
    const authFile = await fs.readFile('server/auth.ts', 'utf8');
    
    // Test JWT verification edge cases
    if (authFile.includes('verifyToken')) {
      reportIssue('unitTests', 'server/auth.ts:verifyToken',
        'JWT verification function needs edge case testing',
        'Medium',
        '1. Call verifyToken with malformed JWT, expired token, invalid signature',
        'Function exists but edge case behavior unknown',
        'Should handle malformed, expired, and invalid tokens gracefully');
    }

    // Test 7.2: Environment validation
    const envFile = await fs.readFile('server/environment.ts', 'utf8');
    
    if (envFile.includes('z.object')) {
      // Good - using Zod for validation
    } else {
      reportIssue('unitTests', 'server/environment.ts',
        'Environment validation may be insufficient',
        'Medium',
        '1. Check environment validation implementation',
        'No Zod schema validation found',
        'Should use proper schema validation for environment variables');
    }

    // Test 7.3: Utility function edge cases
    const storageFile = await fs.readFile('server/storage.ts', 'utf8');
    
    // Check for null/undefined handling in database operations
    if (!storageFile.includes('null') && !storageFile.includes('undefined')) {
      reportIssue('unitTests', 'server/storage.ts',
        'Missing null/undefined handling in database operations',
        'Medium',
        '1. Test database functions with null/undefined inputs',
        'No explicit null/undefined checks found',
        'Database functions should handle null/undefined inputs gracefully');
    }

  } catch (error) {
    reportIssue('unitTests', 'Unit test analysis',
      'Failed to analyze unit test coverage requirements',
      'Medium',
      '1. Check source file accessibility for unit test analysis',
      error.message,
      'Unit test analysis should complete successfully');
  }
}

// 8. PERFORMANCE AND RESOURCE TESTS
async function runPerformanceTests() {
  console.log('\n=== PERFORMANCE ANALYSIS ===\n');
  
  try {
    // Test 8.1: Database query optimization
    const storageFile = await fs.readFile('server/storage.ts', 'utf8');
    
    // Look for potential N+1 queries
    if (storageFile.includes('for (') && storageFile.includes('await db.')) {
      reportIssue('performanceTests', 'server/storage.ts',
        'Potential N+1 query pattern detected',
        'Medium',
        '1. Look for loops containing database queries in storage.ts',
        'Found for loops with database operations',
        'Use batch queries or joins to avoid N+1 query problems');
    }

    // Test 8.2: Memory usage in file operations
    const indexFile = await fs.readFile('server/index.ts', 'utf8');
    
    if (indexFile.includes('express.json()') && !indexFile.includes('limit:')) {
      reportIssue('performanceTests', 'server/index.ts',
        'Missing request body size limits',
        'Medium',
        '1. Check express.json() middleware configuration',
        'No explicit body size limit set',
        'Should set reasonable limits to prevent memory exhaustion');
    }

    // Test 8.3: Rate limiting configuration
    if (indexFile.includes('rateLimit')) {
      // Good - has rate limiting
      if (!indexFile.includes('store:') && !indexFile.includes('MemoryStore')) {
        reportIssue('performanceTests', 'server/index.ts',
          'Rate limiter using default memory store',
          'Low',
          '1. Check rate limiting configuration in server/index.ts',
          'Using default memory store for rate limiting',
          'Consider Redis or database store for production rate limiting');
      }
    } else {
      reportIssue('performanceTests', 'server/index.ts',
        'Missing rate limiting protection',
        'High',
        '1. Check server/index.ts for rate limiting middleware',
        'No rate limiting middleware found',
        'Should implement rate limiting to prevent abuse');
    }

  } catch (error) {
    reportIssue('performanceTests', 'Performance analysis',
      'Failed to analyze performance characteristics',
      'Medium',
      '1. Check performance analysis file accessibility',
      error.message,
      'Performance analysis should complete successfully');
  }
}

// Helper functions
async function getAllSourceFiles() {
  const files = [];
  
  async function scanDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  await scanDirectory('.');
  return files;
}

async function testEndpoint(method, endpoint, data, options) {
  const { expectedStatus, description, category } = options;
  
  try {
    const response = await fetch(`http://localhost:5000${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!expectedStatus.includes(response.status)) {
      reportIssue(category, `${method} ${endpoint}`,
        `Unexpected HTTP status code: ${description}`,
        'Medium',
        `1. Send ${method} request to ${endpoint}${data ? ' with data: ' + JSON.stringify(data) : ''}`,
        `HTTP ${response.status} ${response.statusText}`,
        `Expected one of: ${expectedStatus.join(', ')}`);
    }

    // Check for error handling
    if (response.status >= 400) {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        reportIssue(category, `${method} ${endpoint}`,
          'Error responses should return JSON',
          'Low',
          `1. Send ${method} request to ${endpoint} that triggers error`,
          `Response Content-Type: ${contentType}`,
          'Error responses should have Content-Type: application/json');
      }
    }

  } catch (error) {
    reportIssue(category, `${method} ${endpoint}`,
      'Network error or server not responding',
      'High',
      `1. Send ${method} request to ${endpoint}`,
      error.message,
      'Server should be accessible and respond to requests');
  }
}

// Generate comprehensive report
async function generateReport() {
  console.log('\n=== GENERATING COMPREHENSIVE QA REPORT ===\n');
  
  const totalIssues = Object.values(testResults).reduce((sum, category) => sum + category.length, 0);
  const criticalIssues = Object.values(testResults).flat().filter(issue => issue.severity === 'Critical').length;
  const highIssues = Object.values(testResults).flat().filter(issue => issue.severity === 'High').length;
  const mediumIssues = Object.values(testResults).flat().filter(issue => issue.severity === 'Medium').length;
  const lowIssues = Object.values(testResults).flat().filter(issue => issue.severity === 'Low').length;

  const report = {
    summary: {
      totalIssues,
      severity: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues
      },
      timestamp: new Date().toISOString(),
      testEnvironment: 'Development',
      recommendation: criticalIssues > 0 ? 'BLOCK PRODUCTION DEPLOYMENT' : 
                     highIssues > 5 ? 'FIX HIGH SEVERITY ISSUES BEFORE DEPLOYMENT' : 
                     'PROCEED WITH CAUTION'
    },
    detailedFindings: testResults,
    testCoverage: {
      configurationTests: testResults.configurationTests.length,
      securityTests: testResults.securityTests.length,
      integrationTests: testResults.integrationTests.length,
      edgeCaseTests: testResults.edgeCaseTests.length,
      databaseTests: testResults.databaseTests.length,
      businessLogicTests: testResults.businessLogicTests.length,
      unitTests: testResults.unitTests.length,
      performanceTests: testResults.performanceTests.length
    }
  };

  await fs.writeFile('qa-comprehensive-execution-report.json', JSON.stringify(report, null, 2));
  
  console.log('\n📊 QA ANALYSIS COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total Issues Found: ${totalIssues}`);
  console.log(`Critical: ${criticalIssues} | High: ${highIssues} | Medium: ${mediumIssues} | Low: ${lowIssues}`);
  console.log(`Recommendation: ${report.summary.recommendation}`);
  console.log('='.repeat(50));
  console.log('📄 Detailed report saved to: qa-comprehensive-execution-report.json\n');
  
  return report;
}

// Main execution
async function main() {
  console.log('🚀 STARTING COMPREHENSIVE QA ANALYSIS');
  console.log('Senior QA Engineer Analysis - ScholarLink Platform');
  console.log('='.repeat(60));
  
  // Wait for server to be ready
  console.log('⏱️  Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    await runConfigurationTests();
    await runSecurityTests();
    await runIntegrationTests();
    await runEdgeCaseTests();
    await runDatabaseTests();
    await runBusinessLogicTests();
    await runUnitTests();
    await runPerformanceTests();
    
    const report = await generateReport();
    
    // Exit with appropriate code
    const criticalIssues = report.summary.severity.critical;
    const highIssues = report.summary.severity.high;
    
    if (criticalIssues > 0) {
      console.log('❌ CRITICAL ISSUES FOUND - IMMEDIATE ATTENTION REQUIRED');
      process.exit(1);
    } else if (highIssues > 5) {
      console.log('⚠️  HIGH SEVERITY ISSUES FOUND - REVIEW RECOMMENDED');
      process.exit(2);
    } else {
      console.log('✅ QA ANALYSIS COMPLETED');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ QA Analysis failed:', error);
    process.exit(1);
  }
}

// Run the comprehensive analysis
main().catch(console.error);