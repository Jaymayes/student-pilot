// Manual test implementation for correlation ID middleware
// Run with: tsx server/tests/correlationId.test.ts
import type { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware, correlationErrorHandler, billingCorrelationMiddleware } from '../middleware/correlationId';

// Mock dependencies
vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-12345'
}));

describe('Correlation ID Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    mockReq = {
      headers: {},
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      user: undefined
    };
    mockRes = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  describe('correlationIdMiddleware', () => {
    it('should generate new correlation ID when none provided', () => {
      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('test-uuid-12345');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-uuid-12345');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing valid correlation ID', () => {
      mockReq.headers = { 'x-correlation-id': 'existing-uuid-67890' };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('existing-uuid-67890');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-uuid-67890');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid correlation ID - too long', () => {
      const longId = 'a'.repeat(129); // Over 128 char limit
      mockReq.headers = { 'x-correlation-id': longId };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('test-uuid-12345');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid X-Correlation-ID received')
      );
    });

    it('should reject invalid correlation ID - invalid characters', () => {
      mockReq.headers = { 'x-correlation-id': 'invalid@chars#here!' };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('test-uuid-12345');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle non-string correlation ID', () => {
      mockReq.headers = { 'x-correlation-id': 123 as any };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('test-uuid-12345');
    });

    it('should accept valid alphanumeric with dashes and underscores', () => {
      const validId = 'valid-uuid_123.test';
      mockReq.headers = { 'x-correlation-id': validId };

      correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe(validId);
    });
  });

  describe('billingCorrelationMiddleware', () => {
    it('should apply correlation ID and log billing request', () => {
      mockReq.user = { claims: { sub: 'test-user-123' } };
      mockReq.headers = { 'user-agent': 'test-agent' };

      billingCorrelationMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).correlationId).toBe('test-uuid-12345');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-uuid-12345');
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[test-uuid-12345] Billing Request:',
        expect.objectContaining({
          correlationId: 'test-uuid-12345',
          method: 'GET',
          path: '/test',
          userId: 'test-user-123',
          userAgent: 'test-agent',
          ip: '127.0.0.1'
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing user context', () => {
      billingCorrelationMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[test-uuid-12345] Billing Request:',
        expect.objectContaining({
          userId: undefined
        })
      );
    });
  });

  describe('correlationErrorHandler', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.NODE_ENV = 'production';
    });

    it('should handle errors with correlation ID in production', () => {
      (mockReq as any).correlationId = 'error-test-uuid';
      const error = new Error('Test error');

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'error-test-uuid');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[error-test-uuid] GET /test - Error:',
        expect.objectContaining({
          correlationId: 'error-test-uuid',
          error: 'Test error'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        correlationId: 'error-test-uuid'
      });
    });

    it('should handle auth errors in production', () => {
      (mockReq as any).correlationId = 'auth-error-uuid';
      const error = { name: 'AuthError', message: 'Unauthorized' };

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Authentication failed',
        correlationId: 'auth-error-uuid'
      });
    });

    it('should handle validation errors in production', () => {
      (mockReq as any).correlationId = 'validation-error-uuid';
      const error = { name: 'ZodError', message: 'Validation failed' };

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid input data',
        correlationId: 'validation-error-uuid'
      });
    });

    it('should include error details in development mode', () => {
      process.env.NODE_ENV = 'development';
      (mockReq as any).correlationId = 'dev-error-uuid';
      const error = new Error('Detailed dev error');

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Detailed dev error',
        correlationId: 'dev-error-uuid'
      });
    });

    it('should generate correlation ID if missing', () => {
      const error = new Error('No correlation ID');

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-uuid-12345');
    });

    it('should include user ID in logs when available', () => {
      (mockReq as any).correlationId = 'user-error-uuid';
      mockReq.user = { claims: { sub: 'user-123' } };
      const error = new Error('User error');

      correlationErrorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[user-error-uuid] GET /test - Error:',
        expect.objectContaining({
          userId: 'user-123'
        })
      );
    });
  });
});

describe('Correlation ID Security Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = { setHeader: vi.fn() };
    mockNext = vi.fn();
  });

  it('should reject SQL injection attempts', () => {
    mockReq.headers = { 'x-correlation-id': "'; DROP TABLE users; --" };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).correlationId).toBe('test-uuid-12345');
  });

  it('should reject XSS attempts', () => {
    mockReq.headers = { 'x-correlation-id': '<script>alert("xss")</script>' };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).correlationId).toBe('test-uuid-12345');
  });

  it('should reject header injection attempts', () => {
    mockReq.headers = { 'x-correlation-id': 'valid-id\r\nSet-Cookie: malicious=1' };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).correlationId).toBe('test-uuid-12345');
  });

  it('should handle Unicode and non-ASCII characters', () => {
    mockReq.headers = { 'x-correlation-id': 'test-unicode-🚀-id' };

    correlationIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect((mockReq as any).correlationId).toBe('test-uuid-12345');
  });
});