import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-' + Math.random().toString(36);
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_' + Math.random().toString(36);
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-' + Math.random().toString(36);

// Mock external services
vi.mock('@neondatabase/serverless', () => ({
  neon: vi.fn(() => vi.fn()),
  neonConfig: {}
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
        })
      }
    };
  }
}));

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = {
      create: vi.fn().mockResolvedValue({ id: 'cus_mock' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_mock' })
    };
    paymentIntents = {
      create: vi.fn().mockResolvedValue({ id: 'pi_mock', client_secret: 'pi_mock_secret' })
    };
  }
}));

// Global test utilities
declare global {
  var mockUser: any;
  var createMockRequest: (overrides?: any) => any;
  var createMockResponse: () => any;
}

globalThis.mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

globalThis.createMockRequest = (overrides = {}) => ({
  headers: {},
  body: {},
  params: {},
  query: {},
  user: globalThis.mockUser,
  correlationId: 'test-correlation-id',
  ...overrides
});

globalThis.createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis()
  };
  return res;
};