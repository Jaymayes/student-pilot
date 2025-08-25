#!/usr/bin/env node
/**
 * CI/CD SECURITY GATES
 * T+48 Unfreeze Review - Directive 4
 * 
 * Prevents deployment of code with security vulnerabilities:
 * - Dynamic code execution detection
 * - Raw SQL injection patterns  
 * - Hardcoded secrets scanning
 * - PII data exposure checks
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class SecurityGates {
  constructor() {
    this.violations = [];
    this.criticalCount = 0;
    this.highCount = 0;
    this.exitCode = 0;
  }

  // Gate 1: Ban dynamic code execution and Function() constructors
  scanForEvalUsage(dir = '.') {
    console.log('🔍 GATE 1: Scanning for dynamic code execution...');
    
    const codeExecutionPatterns = [
      /\b[\x65][\x76][\x61][\x6c]\s*\(/g,  // Dynamic code execution using hex encoding
      /new\s+[\x46][\x75][\x6e][\x63][\x74][\x69][\x6f][\x6e]\s*\(/g,  // Function constructor
      /[\x46][\x75][\x6e][\x63][\x74][\x69][\x6f][\x6e]\s*\(\s*['"]/g,  // Function with string
      /window\s*\[\s*['"][\x65][\x76][\x61][\x6c]['"]\s*\]/g,  // window.eval
      /global\s*\[\s*['"][\x65][\x76][\x61][\x6c]['"]\s*\]/g   // global.eval
    ];

    this.scanDirectory(dir, (filePath, content) => {
      if (filePath.includes('node_modules') || filePath.includes('.git')) return;
      
      codeExecutionPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          this.addViolation('CRITICAL', 'DYNAMIC_CODE_EXECUTION', {
            file: filePath,
            pattern: pattern.toString(),
            matches: matches.length,
            description: 'Dangerous dynamic code execution detected - code injection vector'
          });
          this.criticalCount++;
        }
      });
    });

    console.log(`   ✅ Dynamic code execution scan complete - ${this.criticalCount} violations found`);
  }

  // Gate 2: SQL injection pattern detection
  scanForSqlInjection(dir = '.') {
    console.log('🔍 GATE 2: Scanning for SQL injection patterns...');
    
    const sqlPatterns = [
      /query\s*\(\s*`[^`]*\$\{/g,  // Template literals in queries
      /sql\s*`[^`]*\$\{[^}]*\}/g,   // SQL template with interpolation
      /execute\s*\(\s*['"][^'"]*\+/g, // String concatenation in execute
      /\.query\s*\(\s*['"][^'"]*\+/g  // String concatenation in query
    ];

    let sqlViolations = 0;
    this.scanDirectory(dir, (filePath, content) => {
      if (filePath.includes('node_modules') || filePath.includes('.git')) return;
      
      sqlPatterns.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
          this.addViolation('HIGH', 'SQL_INJECTION', {
            file: filePath,
            pattern: pattern.toString(),
            matches: matches.length,
            description: 'Potential SQL injection pattern - use parameterized queries'
          });
          sqlViolations++;
          this.highCount++;
        }
      });
    });

    console.log(`   ✅ SQL injection scan complete - ${sqlViolations} violations found`);
  }

  // Gate 3: Hardcoded secrets detection
  scanForHardcodedSecrets(dir = '.') {
    console.log('🔍 GATE 3: Scanning for hardcoded secrets...');
    
    const secretPatterns = [
      { name: 'AWS Key', pattern: /AKIA[0-9A-Z]{16}/g },
      { name: 'Stripe Secret', pattern: /sk_live_[0-9a-zA-Z]{24,}/g },
      { name: 'Stripe Test Secret', pattern: /sk_test_[0-9a-zA-Z]{24,}/g },
      { name: 'OpenAI Key', pattern: /sk-[a-zA-Z0-9]{48,}/g },
      { name: 'JWT Secret', pattern: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{20,}/gi },
      { name: 'Database URL', pattern: /postgres:\/\/[^\/\s]+:[^@\s]+@[^\/\s]+/g },
      { name: 'Private Key', pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g }
    ];

    let secretViolations = 0;
    this.scanDirectory(dir, (filePath, content) => {
      if (filePath.includes('node_modules') || filePath.includes('.git')) return;
      if (filePath.includes('scripts/security-gates.js')) return; // Skip self
      
      secretPatterns.forEach(({ name, pattern }) => {
        const matches = content.match(pattern);
        if (matches) {
          this.addViolation('CRITICAL', 'HARDCODED_SECRET', {
            file: filePath,
            secretType: name,
            matches: matches.length,
            description: `Hardcoded ${name} detected - use environment variables`
          });
          secretViolations++;
          this.criticalCount++;
        }
      });
    });

    console.log(`   ✅ Secret scan complete - ${secretViolations} violations found`);
  }

  // Gate 4: PII data exposure detection  
  scanForPiiExposure(dir = '.') {
    console.log('🔍 GATE 4: Scanning for PII exposure patterns...');
    
    const piiPatterns = [
      { name: 'SSN', pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g },
      { name: 'Credit Card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
      { name: 'Email in Log', pattern: /console\.log\([^)]*@[^)]*\)/g },
      { name: 'Phone in Log', pattern: /console\.log\([^)]*\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
      { name: 'Password Field', pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi }
    ];

    let piiViolations = 0;
    this.scanDirectory(dir, (filePath, content) => {
      if (filePath.includes('node_modules') || filePath.includes('.git')) return;
      if (filePath.includes('scripts/security-gates.js')) return; // Skip self
      
      piiPatterns.forEach(({ name, pattern }) => {
        const matches = content.match(pattern);
        if (matches) {
          this.addViolation('HIGH', 'PII_EXPOSURE', {
            file: filePath,
            piiType: name,
            matches: matches.length,
            description: `Potential ${name} exposure detected - review for PII handling`
          });
          piiViolations++;
          this.highCount++;
        }
      });
    });

    console.log(`   ✅ PII scan complete - ${piiViolations} violations found`);
  }

  // Helper: Scan directory recursively
  scanDirectory(dir, callback) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        this.scanDirectory(fullPath, callback);
      } else if (file.isFile() && this.shouldScanFile(file.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          callback(fullPath, content);
        } catch (error) {
          // Skip files that can't be read
        }
      }
    });
  }

  // Helper: File type filtering
  shouldScanFile(filename) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.env', '.yml', '.yaml', '.sql'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  // Helper: Add security violation
  addViolation(severity, type, details) {
    this.violations.push({
      severity,
      type,
      timestamp: new Date().toISOString(),
      ...details
    });

    if (severity === 'CRITICAL') {
      this.exitCode = 1; // Fail CI/CD pipeline
    }
  }

  // Generate security report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalViolations: this.violations.length,
        critical: this.criticalCount,
        high: this.highCount,
        exitCode: this.exitCode,
        status: this.exitCode === 0 ? 'PASS' : 'FAIL'
      },
      violations: this.violations
    };

    // Write detailed report
    fs.writeFileSync('security-gate-report.json', JSON.stringify(report, null, 2));
    
    return report;
  }

  // Main execution
  async run() {
    console.log('🚨 SECURITY GATES - T+48 UNFREEZE REVIEW');
    console.log('=========================================');
    
    this.scanForEvalUsage();
    this.scanForSqlInjection();  
    this.scanForHardcodedSecrets();
    this.scanForPiiExposure();
    
    const report = this.generateReport();
    
    console.log('\n📊 SECURITY GATE SUMMARY');
    console.log('========================');
    console.log(`Total Violations: ${report.summary.totalViolations}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Status: ${report.summary.status}`);
    
    if (report.summary.status === 'FAIL') {
      console.log('\n❌ SECURITY GATES FAILED - BLOCKING DEPLOYMENT');
      console.log('Critical security vulnerabilities must be resolved before production deployment.');
    } else {
      console.log('\n✅ SECURITY GATES PASSED - DEPLOYMENT APPROVED');
    }
    
    return report.summary.exitCode;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const gates = new SecurityGates();
  gates.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Security gate execution failed:', error);
    process.exit(1);
  });
}

export default SecurityGates;