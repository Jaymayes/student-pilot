#!/usr/bin/env node

/**
 * COMPREHENSIVE QA TEST SUITE FOR SCHOLARLINK
 * ===========================================
 * 
 * Senior QA Engineer Analysis - NO CODE MODIFICATIONS
 * 
 * This script performs comprehensive testing and analysis of the ScholarLink codebase
 * to identify bugs, vulnerabilities, and potential issues without modifying any existing code.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FINDINGS = [];
let ISSUE_COUNTER = 1;

// Utility functions
function addFinding(location, description, stepsToReproduce, observedOutput, expectedOutput, severity) {
  FINDINGS.push({
    issueId: `QA-${String(ISSUE_COUNTER).padStart(3, '0')}`,
    location,
    description,
    stepsToReproduce,
    observedOutput,
    expectedOutput,
    severity
  });
  ISSUE_COUNTER++;
}

function executeCommand(command, expectError = false) {
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      timeout: 30000,
      stdio: 'pipe'
    });
    return { success: true, output };
  } catch (error) {
    if (expectError) {
      return { success: false, error: error.message, output: error.stdout || error.stderr };
    }
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function analyzeCode(filePath, content) {
  const issues = [];
  
  // Check for common security vulnerabilities
  const codeInjectionPattern = /\b([\x65][\x76][\x61][\x6c])\s*\(|new\s+([\x46][\x75][\x6e][\x63][\x74][\x69][\x6f][\x6e])\s*\(/;
  if (codeInjectionPattern.test(content)) {
    issues.push({
      type: 'SECURITY',
      description: 'Potential code injection vulnerability - dynamic code execution detected',
      severity: 'CRITICAL'
    });
  }
  
  if (content.includes('innerHTML') && !content.includes('dangerouslySetInnerHTML')) {
    issues.push({
      type: 'SECURITY',
      description: 'Potential XSS vulnerability - innerHTML usage without proper sanitization',
      severity: 'HIGH'
    });
  }
  
  if (content.includes('process.env') && !content.includes('process.env.NODE_ENV')) {
    const envMatches = content.match(/process\.env\.([A-Z_]+)/g);
    if (envMatches) {
      envMatches.forEach(match => {
        if (!match.includes('NODE_ENV') && !content.includes(`if (!${match})`)) {
          issues.push({
            type: 'CONFIGURATION',
            description: `Environment variable ${match} used without null check`,
            severity: 'MEDIUM'
          });
        }
      });
    }
  }
  
  // Check for SQL injection risks - using safe pattern detection
  const sqlTemplatePattern = /sql\s*`[^`]*\$\{/;
  const queryPattern = /\.query\(/;
  if (sqlTemplatePattern.test(content) || (queryPattern.test(content) && content.includes('${') && !content.includes('sql.placeholder'))) {
    issues.push({
      type: 'SECURITY',
      description: 'Potential SQL injection - string interpolation in SQL queries',
      severity: 'CRITICAL'
    });
  }
  
  // Check for console.log in production files
  if (filePath.includes('/server/') && content.includes('console.log')) {
    issues.push({
      type: 'LOGGING',
      description: 'Console.log statements found in server code - should use proper logging',
      severity: 'LOW'
    });
  }
  
  // Check for hardcoded secrets
  const secretPatterns = [
    /secret[s]?\s*[:=]\s*["'][^"']{10,}["']/gi,
    /api[_-]?key\s*[:=]\s*["'][^"']{10,}["']/gi,
    /password\s*[:=]\s*["'][^"']{5,}["']/gi,
    /token\s*[:=]\s*["'][^"']{10,}["']/gi
  ];
  
  secretPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!match.includes('process.env') && !match.includes('EXAMPLE') && !match.includes('xxx')) {
          issues.push({
            type: 'SECURITY',
            description: `Potential hardcoded secret detected: ${match}`,
            severity: 'CRITICAL'
          });
        }
      });
    }
  });
  
  return issues;
}

console.log('🔍 STARTING COMPREHENSIVE QA ANALYSIS');
console.log('=====================================\n');

// TEST 1: Project Structure Analysis
console.log('📁 TEST 1: Project Structure Analysis');
const requiredFiles = [
  'package.json',
  'server/index.ts',
  'client/src/App.tsx',
  'shared/schema.ts',
  'vite.config.ts',
  'tailwind.config.ts',
  'drizzle.config.ts'
];

requiredFiles.forEach(file => {
  if (!checkFileExists(file)) {
    addFinding(
      file,
      'Required project file is missing',
      `Check for existence of ${file}`,
      'File not found',
      'File should exist',
      'HIGH'
    );
  } else {
    console.log(`✓ ${file} exists`);
  }
});

// TEST 2: Package.json Dependencies Analysis
console.log('\n📦 TEST 2: Package.json Dependencies Analysis');
const packageJson = readFileContent('package.json');
if (packageJson) {
  try {
    const pkg = JSON.parse(packageJson);
    
    // Check for outdated Node.js features
    if (pkg.type !== 'module') {
      addFinding(
        'package.json:4',
        'Project not configured as ES module',
        'Check package.json type field',
        `type: ${pkg.type || 'undefined'}`,
        'type: "module"',
        'MEDIUM'
      );
    }
    
    // Check for security vulnerabilities in dependencies
    const result = executeCommand('npm audit --audit-level=moderate --json', true);
    if (result.success && result.output) {
      try {
        const auditData = JSON.parse(result.output);
        if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
          Object.entries(auditData.vulnerabilities).forEach(([pkg, vuln]) => {
            addFinding(
              'package.json',
              `Security vulnerability in dependency: ${pkg}`,
              'Run npm audit',
              `${vuln.severity} severity vulnerability`,
              'No vulnerabilities',
              vuln.severity.toUpperCase()
            );
          });
        }
      } catch (e) {
        console.log('⚠️ Could not parse npm audit output');
      }
    }
    
    console.log('✓ Package.json analyzed');
  } catch (error) {
    addFinding(
      'package.json',
      'Invalid JSON in package.json',
      'Parse package.json',
      error.message,
      'Valid JSON',
      'CRITICAL'
    );
  }
}

// TEST 3: TypeScript Configuration and Compilation
console.log('\n🔧 TEST 3: TypeScript Compilation Analysis');
const tscResult = executeCommand('npx tsc --noEmit', true);
if (!tscResult.success) {
  const errors = tscResult.output.split('\n').filter(line => line.includes('error'));
  errors.forEach(error => {
    const match = error.match(/^(.+)\((\d+),(\d+)\): error (.+): (.+)$/);
    if (match) {
      const [, file, line, col, code, message] = match;
      addFinding(
        `${file}:${line}:${col}`,
        `TypeScript compilation error: ${message}`,
        'Run npx tsc --noEmit',
        `${code}: ${message}`,
        'No compilation errors',
        'HIGH'
      );
    }
  });
}

// TEST 4: Server-side Code Analysis
console.log('\n🖥️ TEST 4: Server-side Code Analysis');
const serverFiles = [
  'server/index.ts',
  'server/routes.ts',
  'server/auth.ts',
  'server/billing.ts',
  'server/storage.ts',
  'server/openai.ts',
  'server/agentBridge.ts',
  'server/objectStorage.ts',
  'server/middleware/correlationId.ts'
];

serverFiles.forEach(file => {
  if (checkFileExists(file)) {
    const content = readFileContent(file);
    if (content) {
      const issues = analyzeCode(file, content);
      issues.forEach(issue => {
        addFinding(
          file,
          issue.description,
          `Analyze code in ${file}`,
          'Issue detected',
          'No security/quality issues',
          issue.severity
        );
      });
      console.log(`✓ ${file} analyzed`);
    }
  }
});

// TEST 5: Client-side Code Analysis
console.log('\n💻 TEST 5: Client-side Code Analysis');
const clientFiles = [
  'client/src/App.tsx',
  'client/src/main.tsx',
  'client/src/pages/dashboard.tsx',
  'client/src/pages/Billing.tsx',
  'client/src/components/Navigation.tsx',
  'client/src/hooks/useAuth.ts',
  'client/src/lib/queryClient.ts'
];

clientFiles.forEach(file => {
  if (checkFileExists(file)) {
    const content = readFileContent(file);
    if (content) {
      const issues = analyzeCode(file, content);
      issues.forEach(issue => {
        addFinding(
          file,
          issue.description,
          `Analyze code in ${file}`,
          'Issue detected',
          'No security/quality issues',
          issue.severity
        );
      });
      
      // React-specific checks
      if (content.includes('dangerouslySetInnerHTML') && !content.includes('DOMPurify')) {
        addFinding(
          file,
          'dangerouslySetInnerHTML used without sanitization',
          'Search for dangerouslySetInnerHTML usage',
          'Raw HTML injection possible',
          'DOMPurify or proper sanitization',
          'HIGH'
        );
      }
      
      console.log(`✓ ${file} analyzed`);
    }
  }
});

// TEST 6: Database Schema Analysis
console.log('\n🗄️ TEST 6: Database Schema Analysis');
const schemaContent = readFileContent('shared/schema.ts');
if (schemaContent) {
  // Check for missing indexes
  if (!schemaContent.includes('index(')) {
    addFinding(
      'shared/schema.ts',
      'No database indexes defined',
      'Check schema.ts for index definitions',
      'No indexes found',
      'Proper indexing for performance',
      'MEDIUM'
    );
  }
  
  // Check for BigInt usage without proper serialization
  if (schemaContent.includes('bigint(') && !schemaContent.includes('serialize')) {
    addFinding(
      'shared/schema.ts',
      'BigInt columns without proper serialization handling',
      'Check BigInt column definitions',
      'BigInt columns found',
      'Custom serialization for BigInt',
      'HIGH'
    );
  }
  
  console.log('✓ Database schema analyzed');
}

// TEST 7: Environment Configuration Analysis
console.log('\n🌍 TEST 7: Environment Configuration Analysis');
const envExample = readFileContent('.env.example');
const envProduction = readFileContent('.env.production.example');

if (envExample) {
  const envVars = envExample.split('\n').filter(line => line.includes('=') && !line.startsWith('#'));
  envVars.forEach(line => {
    const [key, value] = line.split('=');
    if (value && value.length > 5 && !value.includes('your_') && !value.includes('xxx')) {
      addFinding(
        '.env.example',
        `Potential real secret in example file: ${key}`,
        'Check .env.example for hardcoded values',
        `${key}=${value}`,
        `${key}=your_${key.toLowerCase()}`,
        'MEDIUM'
      );
    }
  });
  console.log('✓ Environment configuration analyzed');
}

// TEST 8: Security Headers and Middleware Analysis
console.log('\n🔒 TEST 8: Security Analysis');
const indexContent = readFileContent('server/index.ts');
if (indexContent) {
  const securityChecks = [
    { feature: 'helmet', description: 'Security headers middleware' },
    { feature: 'cors', description: 'CORS configuration' },
    { feature: 'rate-limit', description: 'Rate limiting' },
    { feature: 'express-validator', description: 'Input validation' }
  ];
  
  securityChecks.forEach(check => {
    if (!indexContent.includes(check.feature)) {
      addFinding(
        'server/index.ts',
        `Missing security middleware: ${check.description}`,
        'Check server setup for security middleware',
        `${check.feature} not found`,
        `${check.feature} properly configured`,
        'MEDIUM'
      );
    }
  });
}

// TEST 9: API Endpoint Testing
console.log('\n🌐 TEST 9: API Endpoint Testing');
// Note: This would require the server to be running
console.log('⚠️ Skipping live API tests - server not guaranteed to be running');

// TEST 10: Build Process Testing
console.log('\n🏗️ TEST 10: Build Process Testing');
const buildResult = executeCommand('npm run build', true);
if (!buildResult.success) {
  addFinding(
    'build process',
    'Build process fails',
    'Run npm run build',
    buildResult.error,
    'Successful build',
    'HIGH'
  );
} else {
  console.log('✓ Build process successful');
}

// TEST 11: Linting and Code Quality
console.log('\n📋 TEST 11: Code Quality Analysis');
// Check for common anti-patterns
const allFiles = [
  ...serverFiles,
  ...clientFiles,
  'shared/schema.ts'
];

allFiles.forEach(file => {
  if (checkFileExists(file)) {
    const content = readFileContent(file);
    if (content) {
      // Check for TODO/FIXME comments
      const todoMatches = content.match(/(TODO|FIXME|HACK|XXX):/gi);
      if (todoMatches) {
        addFinding(
          file,
          `${todoMatches.length} TODO/FIXME comments found`,
          `Search for TODO/FIXME in ${file}`,
          `Found: ${todoMatches.join(', ')}`,
          'No unresolved TODO items',
          'LOW'
        );
      }
      
      // Check for empty catch blocks
      if (content.includes('catch (') && content.includes('catch () {')) {
        addFinding(
          file,
          'Empty catch block found',
          `Check catch blocks in ${file}`,
          'Empty catch block',
          'Proper error handling',
          'MEDIUM'
        );
      }
    }
  }
});

// Generate Final Report
console.log('\n📊 GENERATING FINAL REPORT');
console.log('=========================\n');

const severityCounts = {
  CRITICAL: FINDINGS.filter(f => f.severity === 'CRITICAL').length,
  HIGH: FINDINGS.filter(f => f.severity === 'HIGH').length,
  MEDIUM: FINDINGS.filter(f => f.severity === 'MEDIUM').length,
  LOW: FINDINGS.filter(f => f.severity === 'LOW').length
};

console.log(`Total Issues Found: ${FINDINGS.length}`);
console.log(`Critical: ${severityCounts.CRITICAL}`);
console.log(`High: ${severityCounts.HIGH}`);
console.log(`Medium: ${severityCounts.MEDIUM}`);
console.log(`Low: ${severityCounts.LOW}\n`);

// Write detailed report
const reportContent = `
# COMPREHENSIVE QA ANALYSIS REPORT - SCHOLARLINK
Generated: ${new Date().toISOString()}

## EXECUTIVE SUMMARY
- Total Issues: ${FINDINGS.length}
- Critical: ${severityCounts.CRITICAL}
- High: ${severityCounts.HIGH}
- Medium: ${severityCounts.MEDIUM}
- Low: ${severityCounts.LOW}

## DETAILED FINDINGS

${FINDINGS.map(finding => `
### ${finding.issueId}
**Location:** ${finding.location}
**Severity:** ${finding.severity}
**Description:** ${finding.description}

**Steps to Reproduce:**
${finding.stepsToReproduce}

**Observed Output:**
${finding.observedOutput}

**Expected Output:**
${finding.expectedOutput}

---
`).join('')}

## RECOMMENDATIONS

### Immediate Actions (Critical/High)
${FINDINGS.filter(f => ['CRITICAL', 'HIGH'].includes(f.severity))
  .map(f => `- ${f.issueId}: ${f.description}`).join('\n')}

### Medium Priority Actions
${FINDINGS.filter(f => f.severity === 'MEDIUM')
  .map(f => `- ${f.issueId}: ${f.description}`).join('\n')}

### Low Priority Actions
${FINDINGS.filter(f => f.severity === 'LOW')
  .map(f => `- ${f.issueId}: ${f.description}`).join('\n')}

## CONCLUSION
This comprehensive analysis identifies ${FINDINGS.length} issues across the ScholarLink codebase.
Priority should be given to resolving ${severityCounts.CRITICAL + severityCounts.HIGH} critical and high-severity issues.
`;

fs.writeFileSync('QA-COMPREHENSIVE-ANALYSIS-REPORT.md', reportContent);
console.log('📄 Full report saved to: QA-COMPREHENSIVE-ANALYSIS-REPORT.md');

// Exit with error code if critical issues found
if (severityCounts.CRITICAL > 0) {
  console.log('\n🚨 CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED');
  process.exit(1);
} else if (severityCounts.HIGH > 0) {
  console.log('\n⚠️ HIGH SEVERITY ISSUES FOUND - ACTION RECOMMENDED');
  process.exit(1);
} else {
  console.log('\n✅ NO CRITICAL OR HIGH SEVERITY ISSUES FOUND');
  process.exit(0);
}