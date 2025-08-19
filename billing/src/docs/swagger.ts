// Swagger/OpenAPI documentation generator

import swaggerJsdoc from 'swagger-jsdoc';
import { appConfig } from '@/config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ScholarLink Billing Service API',
      version: '1.0.0',
      description: 'Production-grade credit billing service for ScholarLink',
      contact: {
        name: 'ScholarLink Team',
        email: 'support@scholarlink.app',
      },
    },
    servers: [
      {
        url: appConfig.isProduction 
          ? 'https://billing.scholarlink.app'
          : `http://localhost:${appConfig.PORT}`,
        description: appConfig.isProduction ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from authentication service',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            balanceCredits: { type: 'string', description: 'Precise balance as decimal string' },
            displayBalance: { type: 'string', description: 'Formatted balance for display' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        RateCard: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            config: {
              type: 'object',
              properties: {
                currency: { type: 'string', example: 'USD' },
                creditPerDollar: { type: 'number', example: 1000 },
                rounding: { type: 'string', enum: ['precise', 'ceil'] },
                models: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      inputPer1k: { type: 'number' },
                      outputPer1k: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        LedgerEntry: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            kind: { type: 'string', enum: ['credit', 'debit', 'adjustment', 'reversal'] },
            amountCredits: { type: 'string', description: 'Amount as decimal string' },
            usdCents: { type: 'integer', nullable: true },
            model: { type: 'string', nullable: true },
            inputTokens: { type: 'integer', nullable: true },
            outputTokens: { type: 'integer', nullable: true },
            rateVersion: { type: 'string' },
            reason: { type: 'string' },
            requestId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Purchase: {
          type: 'object',
          properties: {
            purchaseId: { type: 'string' },
            packageCode: { type: 'string', enum: ['starter', 'basic', 'pro', 'business'] },
            amount: {
              type: 'object',
              properties: {
                usd: { type: 'number' },
                credits: { type: 'string' },
              },
            },
            paymentLink: { type: 'string', format: 'url' },
            status: { type: 'string', enum: ['pending', 'succeeded', 'failed'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'object', nullable: true },
            correlationId: { type: 'string', nullable: true },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        InsufficientCredits: {
          description: 'Insufficient credits for operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'INSUFFICIENT_CREDITS' },
                  details: {
                    type: 'object',
                    properties: {
                      required: { type: 'string', description: 'Required credits' },
                      available: { type: 'string', description: 'Available credits' },
                      shortfall: { type: 'string', description: 'Credit shortfall' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes.ts', './src/routes/**/*.ts'], // Path to the API docs
};

export function generateSwaggerSpec() {
  return swaggerJsdoc(options);
}

export function getApiExamples() {
  return {
    purchase: {
      request: {
        packageCode: 'starter',
      },
      response: {
        purchaseId: 'pur_1234567890',
        packageCode: 'starter',
        amount: {
          usd: 5.00,
          credits: '5000',
        },
        paymentLink: 'https://checkout.stripe.com/pay/cs_test_...',
        status: 'pending',
      },
    },
    reconcile: {
      request: {
        userId: 'user_1234567890',
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        requestId: 'req_1234567890',
        idempotencyKey: 'idem_1234567890',
      },
      response: {
        success: true,
        ledgerEntryId: 'le_1234567890',
        newBalance: '4960.0',
        debitAmount: '40.0',
      },
    },
    ledger: {
      response: {
        entries: [
          {
            id: 'le_1234567890',
            kind: 'debit',
            amountCredits: '-40.0',
            usdCents: null,
            model: 'gpt-4o',
            inputTokens: 1000,
            outputTokens: 500,
            rateVersion: 'v1',
            reason: 'AI model usage',
            requestId: 'req_1234567890',
            createdAt: '2024-01-15T10:30:00Z',
          },
          {
            id: 'le_0987654321',
            kind: 'credit',
            amountCredits: '5000.0',
            usdCents: 500,
            model: null,
            inputTokens: null,
            outputTokens: null,
            rateVersion: 'v1',
            reason: 'Credit purchase',
            requestId: null,
            createdAt: '2024-01-15T10:00:00Z',
          },
        ],
        nextCursor: 'cursor_abc123',
        hasMore: false,
      },
    },
  };
}