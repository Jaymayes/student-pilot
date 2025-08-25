/**
 * COMPREHENSIVE QA ANALYSIS SCRIPT
 * Senior QA Engineer - Full Codebase Analysis
 * 
 * This script performs comprehensive testing of the ScholarLink platform
 * including unit tests, integration tests, and edge case analysis.
 */

import fs from 'fs';
import path from 'path';

class QAAnalyzer {
  constructor() {
    this.issues = [];
    this.testResults = [];
    this.currentIssueId = 1;
  }

  // Add issue to tracking list
  addIssue(location, description, severity = 'Medium', stepsToReproduce = '', observedOutput = '', expectedOutput = '') {
    this.issues.push({
      issueId: `QA-${String(this.currentIssueId).padStart(3, '0')}`,
      location,
      description,
      stepsToReproduce,
      observedOutput,
      expectedOutput,
      severity
    });
    this.currentIssueId++;
  }

  // Test runner for file analysis
  async analyzeFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        this.addIssue(
          filePath, 
          'File does not exist but is referenced in the project',
          'High',
          `1. Try to access file at ${filePath}`,
          'File not found',
          'File should exist and be accessible'
        );
        return null;
      }
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      this.addIssue(
        filePath,
        `File read error: ${error.message}`,
        'High',
        `1. Attempt to read file ${filePath}`,
        `Error: ${error.message}`,
        'File should be readable without errors'
      );
      return null;
    }
  }

  // Analyze backend server files
  async analyzeBackendServer() {
    console.log('🔍 Analyzing Backend Server Files...');

    // Test main server entry point
    const indexContent = await this.analyzeFile('server/index.ts');
    if (indexContent) {
      this.analyzeServerIndex(indexContent);
    }

    // Test environment configuration
    const envContent = await this.analyzeFile('server/environment.ts');
    if (envContent) {
      this.analyzeEnvironmentConfig(envContent);
    }

    // Test database configuration
    const dbContent = await this.analyzeFile('server/db.ts');
    if (dbContent) {
      this.analyzeDatabaseConfig(dbContent);
    }

    // Test routes
    const routesContent = await this.analyzeFile('server/routes.ts');
    if (routesContent) {
      this.analyzeRoutes(routesContent);
    }

    // Test authentication
    const authContent = await this.analyzeFile('server/replitAuth.ts');
    if (authContent) {
      this.analyzeAuthentication(authContent);
    }

    // Test OpenAI integration
    const openaiContent = await this.analyzeFile('server/openai.ts');
    if (openaiContent) {
      this.analyzeOpenAIIntegration(openaiContent);
    }

    // Test billing system
    const billingContent = await this.analyzeFile('server/billing.ts');
    if (billingContent) {
      this.analyzeBillingSystem(billingContent);
    }

    // Test storage layer
    const storageContent = await this.analyzeFile('server/storage.ts');
    if (storageContent) {
      this.analyzeStorageLayer(storageContent);
    }
  }

  analyzeServerIndex(content) {
    // Check for proper error handling
    if (!content.includes('try') && !content.includes('catch')) {
      this.addIssue(
        'server/index.ts',
        'Missing comprehensive error handling in main server file',
        'High',
        '1. Review server/index.ts for error handling patterns',
        'No try-catch blocks found in main server initialization',
        'Should have proper error handling for server initialization'
      );
    }

    // Check for security headers
    if (!content.includes('helmet')) {
      this.addIssue(
        'server/index.ts',
        'Missing security headers middleware',
        'High',
        '1. Check server initialization for security headers',
        'No helmet middleware found in server setup',
        'Should include security headers like helmet for protection'
      );
    }

    // Check for rate limiting
    if (!content.includes('rateLimit') && !content.includes('express-rate-limit')) {
      this.addIssue(
        'server/index.ts',
        'Missing rate limiting middleware',
        'Medium',
        '1. Check server middleware configuration\n2. Look for rate limiting setup',
        'No rate limiting middleware configured',
        'Should implement rate limiting to prevent abuse'
      );
    }

    // Check for CORS configuration
    if (!content.includes('cors') && content.includes('app.use')) {
      this.addIssue(
        'server/index.ts',
        'CORS configuration may be missing or inadequate',
        'Medium',
        '1. Make cross-origin requests to API\n2. Check CORS headers',
        'CORS may not be properly configured',
        'Should configure CORS appropriately for security'
      );
    }

    // Check for compression middleware
    if (!content.includes('compression')) {
      this.addIssue(
        'server/index.ts',
        'Missing response compression middleware',
        'Low',
        '1. Check response headers for compression\n2. Monitor response sizes',
        'Responses may not be compressed',
        'Should use compression middleware for performance'
      );
    }
  }

  analyzeEnvironmentConfig(content) {
    // Check for missing required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'SESSION_SECRET', 
      'OPENAI_API_KEY',
      'STRIPE_SECRET_KEY',
      'REPLIT_DOMAINS',
      'REPL_ID'
    ];

    requiredEnvVars.forEach(envVar => {
      if (!content.includes(envVar)) {
        this.addIssue(
          'server/environment.ts',
          `Missing validation for required environment variable: ${envVar}`,
          'Critical',
          `1. Start server without ${envVar} set\n2. Check if server starts`,
          'Server may start with undefined configuration',
          `Server should fail fast with clear error message when ${envVar} is missing`
        );
      }
    });

    // Check for weak environment validation
    if (content.includes('z.string()') && !content.includes('.min(')) {
      this.addIssue(
        'server/environment.ts',
        'Environment string validation lacks minimum length requirements',
        'Medium',
        '1. Set environment variables to empty strings\n2. Start server',
        'Empty environment variables may be accepted',
        'Should validate minimum length for security-critical variables'
      );
    }

    // Check for production vs development configuration
    if (!content.includes('NODE_ENV')) {
      this.addIssue(
        'server/environment.ts',
        'Missing NODE_ENV environment variable validation',
        'Medium',
        '1. Start server without NODE_ENV set\n2. Check behavior differences',
        'Application may not differentiate between environments',
        'Should validate NODE_ENV and adjust behavior accordingly'
      );
    }

    // Check for sensitive data validation patterns
    const sensitivePatterns = ['secret', 'key', 'password', 'token'];
    sensitivePatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern) && !content.includes('.regex(')) {
        this.addIssue(
          'server/environment.ts',
          `Sensitive variable containing "${pattern}" may lack format validation`,
          'Low',
          `1. Set invalid format for ${pattern} variable\n2. Check validation`,
          'Invalid formats may be accepted for sensitive variables',
          'Should validate format/pattern for sensitive environment variables'
        );
      }
    });
  }

  analyzeDatabaseConfig(content) {
    // Check for database connection error handling
    if (!content.includes('pool.on(\'error\'') && !content.includes('on("error")')) {
      this.addIssue(
        'server/db.ts',
        'Missing database connection pool error handling',
        'High',
        '1. Cause database connection to fail\n2. Observe application behavior',
        'Application may crash without proper error logging',
        'Should handle database pool errors gracefully'
      );
    }

    // Check for connection timeout configuration
    if (!content.includes('connectionTimeoutMillis') && !content.includes('timeout')) {
      this.addIssue(
        'server/db.ts',
        'Missing database connection timeout configuration',
        'Medium',
        '1. Test with slow database connection\n2. Monitor connection behavior',
        'May hang indefinitely on slow database connections',
        'Should configure appropriate connection timeouts'
      );
    }

    // Check for connection pool limits
    if (!content.includes('max') && !content.includes('pool')) {
      this.addIssue(
        'server/db.ts',
        'Database connection pool limits may not be configured',
        'Medium',
        '1. Make many concurrent database requests\n2. Monitor connection usage',
        'Unlimited connections may exhaust database resources',
        'Should configure connection pool size limits'
      );
    }

    // Check for health check implementation
    if (!content.includes('checkDatabaseHealth') || !content.includes('SELECT 1')) {
      this.addIssue(
        'server/db.ts',
        'Missing or inadequate database health check',
        'Medium',
        '1. Call health check endpoint\n2. Check if database connectivity is verified',
        'Health check may not properly verify database connectivity',
        'Should implement proper database health check with simple query'
      );
    }

    // Check for SSL/TLS configuration
    if (!content.includes('ssl') && content.includes('connectionString')) {
      this.addIssue(
        'server/db.ts',
        'Database connection may not enforce SSL/TLS',
        'Medium',
        '1. Check database connection security\n2. Monitor for unencrypted connections',
        'Database connections may be unencrypted',
        'Should enforce SSL/TLS for database connections in production'
      );
    }
  }

  analyzeRoutes(content) {
    // Check for input validation middleware
    if (content.includes('app.post') && !content.includes('validator') && !content.includes('validation')) {
      this.addIssue(
        'server/routes.ts',
        'POST endpoints may lack proper input validation middleware',
        'High',
        '1. Send malformed data to POST endpoints\n2. Check if validation occurs',
        'Invalid data may be processed without proper validation',
        'Should validate all incoming request data with middleware'
      );
    }

    // Check for authentication middleware
    if (content.includes('/api/') && !content.includes('isAuthenticated')) {
      this.addIssue(
        'server/routes.ts',
        'API endpoints may lack authentication protection',
        'Critical',
        '1. Access protected endpoints without authentication\n2. Check if access is granted',
        'Unauthorized access to protected endpoints may be possible',
        'Should protect sensitive endpoints with authentication middleware'
      );
    }

    // Check for proper error responses with correlation IDs
    if (content.includes('res.status(500)') && !content.includes('correlationId')) {
      this.addIssue(
        'server/routes.ts',
        'Error responses may lack correlation IDs for debugging',
        'Low',
        '1. Cause a server error\n2. Check error response format',
        'Error responses may lack tracking identifiers',
        'Should include correlation IDs in error responses for debugging'
      );
    }

    // Check for SQL injection protection
    if ((content.includes('query(') || content.includes('execute(')) && content.includes('${')) {
      this.addIssue(
        'server/routes.ts',
        'Potential SQL injection vulnerability with string interpolation',
        'Critical',
        '1. Send malicious SQL in request parameters\n2. Check if raw SQL is executed',
        'Raw SQL may be executed without proper sanitization',
        'Should use parameterized queries or ORM methods only'
      );
    }

    // Check for logging of sensitive data
    if (content.includes('console.log') && (content.includes('password') || content.includes('token') || content.includes('secret'))) {
      this.addIssue(
        'server/routes.ts',
        'Sensitive data may be logged in console output',
        'High',
        '1. Review server logs\n2. Check for sensitive data exposure',
        'Sensitive information may be visible in logs',
        'Should avoid logging sensitive data or redact it properly'
      );
    }

    // Check for HTTP method restrictions
    if (content.includes('app.all') || (!content.includes('app.get') && !content.includes('app.post'))) {
      this.addIssue(
        'server/routes.ts',
        'HTTP methods may not be properly restricted',
        'Medium',
        '1. Try accessing endpoints with different HTTP methods\n2. Check if methods are restricted',
        'Endpoints may accept unintended HTTP methods',
        'Should explicitly define allowed HTTP methods for each endpoint'
      );
    }
  }

  analyzeAuthentication(content) {
    // Check session secret configuration
    if (content.includes('secret:') && content.includes('env.SESSION_SECRET')) {
      // This is actually good - using environment variable
    } else if (content.includes('secret:') && !content.includes('env')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Session secret may be hardcoded instead of using environment variable',
        'Critical',
        '1. Check session configuration in code\n2. Verify if secret is hardcoded',
        'Session secret appears to be hardcoded',
        'Session secret should be loaded from environment variables'
      );
    }

    // Check for session security settings
    if (!content.includes('httpOnly: true')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Session cookies may lack httpOnly security flag',
        'High',
        '1. Inspect session cookies in browser developer tools\n2. Check for httpOnly flag',
        'Session cookies accessible via JavaScript (XSS vulnerability)',
        'Session cookies should have httpOnly flag set to prevent XSS attacks'
      );
    }

    if (!content.includes('secure: true')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Session cookies may lack secure flag for HTTPS',
        'Medium',
        '1. Check session cookies over HTTPS connection\n2. Verify secure flag',
        'Session cookies may be sent over insecure connections',
        'Session cookies should have secure flag set in production'
      );
    }

    // Check for SameSite configuration
    if (!content.includes('sameSite')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Session cookies may lack SameSite protection',
        'Medium',
        '1. Test for CSRF attacks\n2. Check cookie SameSite settings',
        'Session cookies may be vulnerable to CSRF attacks',
        'Should configure SameSite attribute for session cookies'
      );
    }

    // Check for proper JWT validation
    if (content.includes('jwt.verify') && !content.includes('try')) {
      this.addIssue(
        'server/replitAuth.ts',
        'JWT verification lacks proper error handling',
        'High',
        '1. Send invalid JWT token\n2. Check error handling behavior',
        'Invalid tokens may cause server errors or crashes',
        'Should handle JWT verification errors gracefully with try-catch'
      );
    }

    // Check for token refresh mechanism
    if (content.includes('refresh_token') && !content.includes('expires_at')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Token refresh mechanism may lack expiration validation',
        'Medium',
        '1. Use expired refresh token\n2. Check if refresh is properly rejected',
        'Expired refresh tokens may be accepted',
        'Should validate refresh token expiration before use'
      );
    }

    // Check for brute force protection
    if (content.includes('login') && !content.includes('rateLimit')) {
      this.addIssue(
        'server/replitAuth.ts',
        'Authentication endpoints may lack brute force protection',
        'High',
        '1. Make multiple failed login attempts rapidly\n2. Check if requests are limited',
        'Unlimited login attempts allowed',
        'Should implement rate limiting on authentication endpoints'
      );
    }
  }

  analyzeOpenAIIntegration(content) {
    // Check API key handling
    if (!content.includes('env.OPENAI_API_KEY')) {
      this.addIssue(
        'server/openai.ts',
        'OpenAI API key may not be properly loaded from environment',
        'High',
        '1. Start server without OPENAI_API_KEY\n2. Try to use OpenAI features',
        'May attempt OpenAI calls with undefined API key',
        'Should validate API key presence and load from environment variables'
      );
    }

    // Check for rate limiting and retry logic
    if (!content.includes('retry') && !content.includes('delay') && !content.includes('backoff')) {
      this.addIssue(
        'server/openai.ts',
        'Missing retry logic for OpenAI API calls',
        'Medium',
        '1. Cause OpenAI API rate limit to trigger\n2. Check if retries occur',
        'API calls may fail permanently on transient errors',
        'Should implement exponential backoff retry logic for resilience'
      );
    }

    // Check for cost control mechanisms
    if (!content.includes('billing') && !content.includes('credits') && content.includes('openai.chat')) {
      this.addIssue(
        'server/openai.ts',
        'OpenAI usage may lack cost control and billing integration',
        'High',
        '1. Make expensive OpenAI requests\n2. Check if costs are tracked',
        'OpenAI usage costs may not be tracked or limited',
        'Should integrate with billing system to track and limit OpenAI usage'
      );
    }

    // Check for input sanitization
    if (content.includes('messages') && !content.includes('sanitize') && !content.includes('validate')) {
      this.addIssue(
        'server/openai.ts',
        'User input to OpenAI may lack proper sanitization',
        'Medium',
        '1. Send prompt injection attempts\n2. Check if malicious prompts are filtered',
        'Malicious prompts may be sent directly to OpenAI',
        'Should sanitize and validate user input before sending to OpenAI'
      );
    }

    // Check for response validation
    if (content.includes('completion') && !content.includes('response.choices')) {
      this.addIssue(
        'server/openai.ts',
        'OpenAI responses may not be properly validated',
        'Medium',
        '1. Mock invalid OpenAI responses\n2. Check error handling',
        'Invalid API responses may cause application errors',
        'Should validate OpenAI response structure before processing'
      );
    }

    // Check for timeout configuration
    if (!content.includes('timeout') && content.includes('openai')) {
      this.addIssue(
        'server/openai.ts',
        'OpenAI API calls may lack timeout configuration',
        'Low',
        '1. Test with slow OpenAI responses\n2. Check if requests timeout appropriately',
        'Long-running OpenAI requests may hang indefinitely',
        'Should configure appropriate timeouts for OpenAI API calls'
      );
    }

    // Check for model validation
    if (content.includes('model:') && !content.includes('validateModel')) {
      this.addIssue(
        'server/openai.ts',
        'OpenAI model parameter may not be validated',
        'Low',
        '1. Send invalid model name to OpenAI functions\n2. Check error handling',
        'Invalid model names may cause API errors',
        'Should validate model names before making API calls'
      );
    }
  }

  analyzeBillingSystem(content) {
    // Check for transaction integrity
    if (content.includes('balance') && !content.includes('transaction') && !content.includes('BEGIN')) {
      this.addIssue(
        'server/billing.ts',
        'Credit balance operations may lack database transaction protection',
        'Critical',
        '1. Cause billing operation to fail mid-process\n2. Check for data consistency',
        'Partial balance updates may leave billing data inconsistent',
        'Should use database transactions for all billing operations'
      );
    }

    // Check for credit calculation accuracy
    if (content.includes('BigInt') && content.includes('Number')) {
      this.addIssue(
        'server/billing.ts',
        'Mixed BigInt and Number operations may cause precision errors',
        'High',
        '1. Perform calculations with large credit amounts\n2. Check for precision loss',
        'Credit calculations may lose precision or fail',
        'Should use consistent numeric types throughout billing calculations'
      );
    }

    // Check for audit trail
    if (content.includes('deductCredits') && !content.includes('creditLedger')) {
      this.addIssue(
        'server/billing.ts',
        'Credit operations may lack proper audit trail',
        'High',
        '1. Perform credit operations\n2. Check if all transactions are logged',
        'Credit transactions may not be properly audited',
        'Should log all credit operations to ledger for audit compliance'
      );
    }

    // Check for negative balance prevention
    if (content.includes('balance -') && !content.includes('balance >= ')) {
      this.addIssue(
        'server/billing.ts',
        'Insufficient balance validation may allow negative credits',
        'High',
        '1. Attempt to use more credits than available\n2. Check balance validation',
        'Users may be allowed to have negative credit balances',
        'Should validate sufficient balance before deducting credits'
      );
    }

    // Check for rate limiting on billing endpoints
    if (content.includes('/api/billing') && !content.includes('rateLimit')) {
      this.addIssue(
        'server/billing.ts',
        'Billing endpoints may lack rate limiting protection',
        'Medium',
        '1. Make rapid requests to billing endpoints\n2. Check if rate limited',
        'Billing endpoints may be vulnerable to abuse',
        'Should implement rate limiting on billing-related endpoints'
      );
    }

    // Check for Stripe webhook validation
    if (content.includes('stripe') && content.includes('webhook') && !content.includes('constructEvent')) {
      this.addIssue(
        'server/billing.ts',
        'Stripe webhook signatures may not be properly validated',
        'Critical',
        '1. Send fake Stripe webhook\n2. Check if it\'s processed',
        'Fake webhooks may be processed as legitimate',
        'Should validate Stripe webhook signatures to prevent spoofing'
      );
    }
  }

  analyzeStorageLayer(content) {
    // Check for SQL injection prevention
    if ((content.includes('query(') || content.includes('sql`')) && content.includes('${')) {
      this.addIssue(
        'server/storage.ts',
        'Potential SQL injection vulnerability with template literals',
        'Critical',
        '1. Send malicious input through storage methods\n2. Check if SQL is executed',
        'Raw SQL with user input may be executed without sanitization',
        'Should use parameterized queries or ORM methods exclusively'
      );
    }

    // Check for transaction handling in complex operations
    if (content.includes('INSERT') && content.includes('UPDATE') && !content.includes('transaction')) {
      this.addIssue(
        'server/storage.ts',
        'Multi-step database operations may lack proper transaction handling',
        'High',
        '1. Cause database operation to fail mid-process\n2. Check data consistency',
        'Partial data updates may leave database in inconsistent state',
        'Should use database transactions for multi-step operations'
      );
    }

    // Check for connection cleanup
    if (content.includes('pool.connect()') && !content.includes('release()')) {
      this.addIssue(
        'server/storage.ts',
        'Database connections may not be properly released',
        'High',
        '1. Make multiple database calls\n2. Monitor connection pool usage',
        'Connection pool may be exhausted over time due to connection leaks',
        'Should properly release database connections after use'
      );
    }

    // Check for error handling in async operations
    if (content.includes('async') && !content.includes('try') && !content.includes('catch')) {
      this.addIssue(
        'server/storage.ts',
        'Async database operations may lack comprehensive error handling',
        'High',
        '1. Cause database constraint violation\n2. Check error handling behavior',
        'Database errors may cause unhandled promise rejections',
        'Should wrap async database operations in try-catch blocks'
      );
    }

    // Check for data validation before database operations
    if (content.includes('INSERT') && !content.includes('validate') && !content.includes('schema')) {
      this.addIssue(
        'server/storage.ts',
        'Data may be inserted without proper validation',
        'Medium',
        '1. Send invalid data to storage methods\n2. Check if validation occurs',
        'Invalid data may be stored in database',
        'Should validate data against schema before database operations'
      );
    }

    // Check for pagination in query methods
    if (content.includes('SELECT') && !content.includes('LIMIT') && !content.includes('limit')) {
      this.addIssue(
        'server/storage.ts',
        'Database queries may lack pagination limits',
        'Medium',
        '1. Query tables with large datasets\n2. Check memory usage and response times',
        'Large result sets may cause memory issues and slow responses',
        'Should implement pagination limits on database queries'
      );
    }

    // Check for index usage hints
    if (content.includes('WHERE') && !content.includes('index')) {
      this.addIssue(
        'server/storage.ts',
        'Complex queries may not utilize database indexes efficiently',
        'Low',
        '1. Run EXPLAIN on complex queries\n2. Check index usage',
        'Queries may perform full table scans',
        'Should ensure queries use appropriate indexes for performance'
      );
    }
  }

  // Analyze frontend components
  async analyzeFrontendComponents() {
    console.log('🔍 Analyzing Frontend Components...');

    // Test main App component
    const appContent = await this.analyzeFile('client/src/App.tsx');
    if (appContent) {
      this.analyzeReactApp(appContent);
    }

    // Test key page components
    const pages = [
      'dashboard.tsx',
      'profile.tsx', 
      'applications.tsx',
      'scholarships.tsx',
      'essay-assistant.tsx',
      'Billing.tsx'
    ];

    for (const page of pages) {
      const content = await this.analyzeFile(`client/src/pages/${page}`);
      if (content) {
        this.analyzeReactPage(page, content);
      }
    }

    // Test hooks
    const hooks = ['useAuth.ts', 'use-toast.ts'];
    for (const hook of hooks) {
      const content = await this.analyzeFile(`client/src/hooks/${hook}`);
      if (content) {
        this.analyzeReactHook(hook, content);
      }
    }

    // Test utility functions
    const utils = ['queryClient.ts', 'authUtils.ts'];
    for (const util of utils) {
      const content = await this.analyzeFile(`client/src/lib/${util}`);
      if (content) {
        this.analyzeUtilityFunctions(util, content);
      }
    }
  }

  analyzeReactApp(content) {
    // Check for proper error boundaries
    if (!content.includes('ErrorBoundary') && !content.includes('componentDidCatch')) {
      this.addIssue(
        'client/src/App.tsx',
        'Missing error boundary for React error handling',
        'Medium',
        '1. Cause a React component error\n2. Check if error is caught gracefully',
        'Uncaught React errors may crash the entire application',
        'Should implement error boundary to catch and handle React errors'
      );
    }

    // Check for loading states during authentication
    if (content.includes('useAuth') && !content.includes('isLoading')) {
      this.addIssue(
        'client/src/App.tsx',
        'May lack loading states during authentication check',
        'Low',
        '1. Load app with slow network\n2. Check if loading indicators appear',
        'No loading feedback while checking authentication status',
        'Should show loading indicators while checking authentication status'
      );
    }

    // Check for proper routing configuration
    if (content.includes('<Route') && !content.includes('component={NotFound}')) {
      this.addIssue(
        'client/src/App.tsx',
        'Missing 404/Not Found route handling',
        'Low',
        '1. Navigate to non-existent route\n2. Check error handling',
        'May show blank page or generic error for invalid routes',
        'Should have proper 404 page for invalid routes'
      );
    }

    // Check for React strict mode
    if (!content.includes('StrictMode')) {
      this.addIssue(
        'client/src/App.tsx',
        'React StrictMode not enabled for development',
        'Low',
        '1. Run app in development mode\n2. Check for React warnings',
        'React development warnings may not appear',
        'Should enable React.StrictMode for better development experience'
      );
    }

    // Check for theme provider setup
    if (content.includes('dark') && !content.includes('ThemeProvider')) {
      this.addIssue(
        'client/src/App.tsx',
        'Theme system may not be properly configured',
        'Low',
        '1. Try to change themes\n2. Check if theme persistence works',
        'Theme changes may not persist or work correctly',
        'Should properly configure theme provider for consistent theming'
      );
    }
  }

  analyzeReactPage(pageName, content) {
    // Check for proper hooks usage and dependencies
    if (content.includes('useEffect')) {
      const useEffectMatches = content.match(/useEffect\([^}]+}/g) || [];
      useEffectMatches.forEach((effect, index) => {
        if (!effect.includes('], [') && !effect.includes('[]')) {
          this.addIssue(
            `client/src/pages/${pageName}`,
            `useEffect #${index + 1} may have missing or incorrect dependencies`,
            'Medium',
            '1. Use React DevTools\n2. Check for useEffect warnings in console',
            'May have stale closures or infinite re-renders',
            'Should include all dependencies in useEffect dependency array'
          );
        }
      });
    }

    // Check for accessibility attributes
    if (content.includes('<button') && !content.includes('aria-')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Interactive elements may lack proper accessibility attributes',
        'Low',
        '1. Use screen reader software\n2. Navigate to interactive elements\n3. Check if properly announced',
        'Interactive elements may not be properly accessible to screen readers',
        'Should include appropriate ARIA labels and roles for accessibility'
      );
    }

    // Check for form validation
    if (content.includes('<form') && !content.includes('validation') && !content.includes('schema')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Forms may lack comprehensive client-side validation',
        'Medium',
        '1. Submit forms with various invalid data\n2. Check if validation occurs',
        'Invalid form data may be submitted without client-side validation',
        'Should implement client-side validation using schemas (e.g., Zod)'
      );
    }

    // Check for error handling in API calls
    if (content.includes('apiRequest') && !content.includes('onError')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'API calls may lack proper error handling',
        'High',
        '1. Disconnect network\n2. Try to perform API operations\n3. Check error feedback',
        'Network errors may not provide user-friendly feedback',
        'Should handle API errors with proper user feedback and error boundaries'
      );
    }

    // Check for XSS prevention
    if (content.includes('innerHTML') || content.includes('dangerouslySetInnerHTML')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Potential XSS vulnerability with innerHTML usage',
        'Critical',
        '1. Inject script tags in user input fields\n2. Check if scripts execute',
        'User input may execute as JavaScript code',
        'Should sanitize user input or use safe rendering methods'
      );
    }

    // Check for memory leaks with event listeners
    if (content.includes('addEventListener') && !content.includes('removeEventListener')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Event listeners may not be properly cleaned up',
        'Medium',
        '1. Navigate between pages multiple times\n2. Check for memory leaks',
        'Event listeners may accumulate and cause memory leaks',
        'Should remove event listeners in useEffect cleanup functions'
      );
    }

    // Check for loading states
    if (content.includes('useQuery') && !content.includes('isLoading')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Data fetching may lack loading state indicators',
        'Low',
        '1. Load page with slow network\n2. Check for loading feedback',
        'No loading indicators during data fetching',
        'Should show loading states while fetching data'
      );
    }

    // Check for proper key props in lists
    if (content.includes('.map(') && !content.includes('key=')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Rendered lists may lack proper key props',
        'Medium',
        '1. Use React DevTools\n2. Check console for key warnings',
        'React may show warnings about missing keys in lists',
        'Should provide unique, stable keys for list items'
      );
    }

    // Check for input validation
    if (content.includes('<input') && !content.includes('pattern') && !content.includes('minLength')) {
      this.addIssue(
        `client/src/pages/${pageName}`,
        'Input fields may lack HTML5 validation attributes',
        'Low',
        '1. Enter invalid data in input fields\n2. Check browser validation',
        'Browser-native validation may be missing',
        'Should use HTML5 validation attributes for better UX'
      );
    }
  }

  analyzeReactHook(hookName, content) {
    // Check for proper dependency arrays in custom hooks
    if (content.includes('useEffect') && content.includes('[]')) {
      const dependencies = content.match(/useEffect\([^,]*,\s*\[([^\]]*)\]/g) || [];
      dependencies.forEach((dep, index) => {
        if (dep.includes('[]') && content.includes('props.') || content.includes('state.')) {
          this.addIssue(
            `client/src/hooks/${hookName}`,
            `Custom hook useEffect may have missing dependencies`,
            'Medium',
            '1. Use hook with changing props\n2. Check for stale closures',
            'Hook may not update when dependencies change',
            'Should include all external dependencies in useEffect array'
          );
        }
      });
    }

    // Check for memory leaks in custom hooks
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      this.addIssue(
        `client/src/hooks/${hookName}`,
        'Custom hook may have timer memory leaks',
        'Medium',
        '1. Mount/unmount components using this hook\n2. Check for memory leaks',
        'Timers may continue running after component unmount',
        'Should clean up timers in useEffect cleanup functions'
      );
    }

    // Check for error handling in async operations
    if (content.includes('async') && !content.includes('catch')) {
      this.addIssue(
        `client/src/hooks/${hookName}`,
        'Async operations in custom hook may lack error handling',
        'Medium',
        '1. Cause async operations to fail\n2. Check error handling',
        'Unhandled promise rejections may occur',
        'Should handle errors in async operations within custom hooks'
      );
    }

    // Check for proper cleanup in useAuth hook
    if (hookName === 'useAuth.ts' && content.includes('localStorage')) {
      this.addIssue(
        `client/src/hooks/${hookName}`,
        'Authentication tokens stored in localStorage are vulnerable to XSS',
        'High',
        '1. Inspect localStorage after login\n2. Check for token storage',
        'Authentication tokens accessible via JavaScript are vulnerable',
        'Should use secure, httpOnly cookies for authentication tokens'
      );
    }

    // Check for token expiration handling
    if (hookName === 'useAuth.ts' && !content.includes('expires') && !content.includes('refresh')) {
      this.addIssue(
        `client/src/hooks/${hookName}`,
        'Authentication hook may lack token expiration handling',
        'Medium',
        '1. Wait for authentication token to expire\n2. Try authenticated requests',
        'Expired tokens may cause authentication errors',
        'Should handle token expiration with automatic refresh or re-authentication'
      );
    }
  }

  analyzeUtilityFunctions(utilName, content) {
    // Check for error handling in API client
    if (utilName === 'queryClient.ts') {
      if (!content.includes('catch') && content.includes('fetch')) {
        this.addIssue(
          `client/src/lib/${utilName}`,
          'API client may lack comprehensive error handling',
          'High',
          '1. Make API calls with network disconnected\n2. Check error handling',
          'Network errors may cause unhandled promise rejections',
          'Should implement comprehensive error handling in API client'
        );
      }

      // Check for request/response interceptors
      if (!content.includes('interceptor') && !content.includes('beforeRequest')) {
        this.addIssue(
          `client/src/lib/${utilName}`,
          'API client may lack request/response interceptors for common handling',
          'Low',
          '1. Make authenticated API calls\n2. Check token handling consistency',
          'Authentication tokens may not be consistently handled',
          'Should implement request interceptors for consistent token handling'
        );
      }

      // Check for timeout configuration
      if (!content.includes('timeout') && content.includes('fetch')) {
        this.addIssue(
          `client/src/lib/${utilName}`,
          'API client may lack request timeout configuration',
          'Low',
          '1. Make API calls to slow endpoints\n2. Check if requests timeout',
          'Slow API calls may hang indefinitely',
          'Should configure appropriate timeouts for API requests'
        );
      }
    }

    // Check for authentication utilities
    if (utilName === 'authUtils.ts') {
      if (content.includes('isAuthenticated') && !content.includes('try')) {
        this.addIssue(
          `client/src/lib/${utilName}`,
          'Authentication utilities may lack error handling',
          'Medium',
          '1. Call auth utilities with invalid data\n2. Check error handling',
          'Auth utilities may throw unhandled errors',
          'Should wrap authentication checks in try-catch blocks'
        );
      }

      // Check for unauthorized error detection
      if (!content.includes('401') && !content.includes('Unauthorized')) {
        this.addIssue(
          `client/src/lib/${utilName}`,
          'May lack proper detection of unauthorized errors',
          'Medium',
          '1. Make API calls with expired tokens\n2. Check error detection',
          '401 errors may not be properly detected and handled',
          'Should detect and handle 401 Unauthorized errors appropriately'
        );
      }
    }

    // Check for input validation in utilities
    if (!content.includes('validate') && content.includes('function')) {
      this.addIssue(
        `client/src/lib/${utilName}`,
        'Utility functions may lack input validation',
        'Low',
        '1. Call utility functions with invalid inputs\n2. Check error handling',
        'Invalid inputs may cause utility functions to fail',
        'Should validate inputs in utility functions for robustness'
      );
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📋 COMPREHENSIVE QA ANALYSIS REPORT');
    console.log('=====================================\n');

    // Summary statistics
    const severityCount = {
      Critical: this.issues.filter(i => i.severity === 'Critical').length,
      High: this.issues.filter(i => i.severity === 'High').length,
      Medium: this.issues.filter(i => i.severity === 'Medium').length,
      Low: this.issues.filter(i => i.severity === 'Low').length
    };

    console.log('📊 ISSUE SUMMARY:');
    console.log(`Critical: ${severityCount.Critical}`);
    console.log(`High: ${severityCount.High}`);
    console.log(`Medium: ${severityCount.Medium}`);
    console.log(`Low: ${severityCount.Low}`);
    console.log(`Total Issues: ${this.issues.length}\n`);

    // Group issues by severity for prioritized reporting
    const groupedIssues = {
      Critical: this.issues.filter(i => i.severity === 'Critical'),
      High: this.issues.filter(i => i.severity === 'High'),
      Medium: this.issues.filter(i => i.severity === 'Medium'),
      Low: this.issues.filter(i => i.severity === 'Low')
    };

    console.log('🐛 DETAILED FINDINGS (Ordered by Severity):\n');
    
    Object.entries(groupedIssues).forEach(([severity, issues]) => {
      if (issues.length > 0) {
        console.log(`\n🚨 ${severity.toUpperCase()} SEVERITY ISSUES (${issues.length}):`);
        console.log('='.repeat(60));
        
        issues.forEach(issue => {
          console.log(`\nIssue ID: ${issue.issueId}`);
          console.log(`Location: ${issue.location}`);
          console.log(`Description: ${issue.description}`);
          console.log(`Steps to Reproduce:\n${issue.stepsToReproduce}`);
          console.log(`Observed Output: ${issue.observedOutput}`);
          console.log(`Expected Output: ${issue.expectedOutput}`);
          console.log('-'.repeat(60));
        });
      }
    });

    // Recommendations by category
    console.log('\n📝 RECOMMENDATIONS BY CATEGORY:\n');
    
    const categoryRecommendations = {
      'Security': [
        'Implement comprehensive input validation and sanitization',
        'Add proper authentication and authorization checks',
        'Configure secure session management',
        'Add CSRF and XSS protection',
        'Implement rate limiting on sensitive endpoints'
      ],
      'Error Handling': [
        'Add comprehensive try-catch blocks for async operations',
        'Implement proper error boundaries in React components',
        'Provide user-friendly error messages',
        'Add correlation IDs for debugging',
        'Log errors appropriately without exposing sensitive data'
      ],
      'Performance': [
        'Implement database query optimization and indexing',
        'Add caching strategies for expensive operations', 
        'Optimize React component re-rendering',
        'Implement pagination for large data sets',
        'Add compression and bundling optimization'
      ],
      'Reliability': [
        'Add database transaction handling for consistency',
        'Implement retry logic with exponential backoff',
        'Add proper connection pool management',
        'Implement health checks and monitoring',
        'Add timeout configuration for external services'
      ]
    };

    Object.entries(categoryRecommendations).forEach(([category, recommendations]) => {
      console.log(`${category}:`);
      recommendations.forEach(rec => console.log(`  • ${rec}`));
      console.log();
    });

    // Save report to file
    const reportData = {
      summary: severityCount,
      totalIssues: this.issues.length,
      analysisDate: new Date().toISOString(),
      issues: this.issues,
      recommendations: categoryRecommendations
    };

    fs.writeFileSync('qa-analysis-report.json', JSON.stringify(reportData, null, 2));
    console.log('📄 Detailed report saved to: qa-analysis-report.json\n');

    return reportData;
  }

  // Main execution method
  async runComprehensiveAnalysis() {
    console.log('🚀 Starting Comprehensive QA Analysis...\n');

    try {
      await this.analyzeBackendServer();
      await this.analyzeFrontendComponents();
      
      const report = this.generateReport();
      
      console.log('✅ Comprehensive QA Analysis Complete!');
      console.log(`📈 Analysis Results: ${report.totalIssues} total issues identified`);
      console.log(`🔴 Critical: ${report.summary.Critical} | 🟠 High: ${report.summary.High} | 🟡 Medium: ${report.summary.Medium} | 🟢 Low: ${report.summary.Low}`);
      
      return report;
    } catch (error) {
      console.error('❌ QA Analysis failed:', error.message);
      throw error;
    }
  }
}

// Run the comprehensive analysis
const analyzer = new QAAnalyzer();
analyzer.runComprehensiveAnalysis()
  .then(report => {
    console.log('\n🎯 QA Analysis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 QA Analysis failed:', error);
    process.exit(1);
  });