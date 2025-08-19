# ScholarLink Billing Service

A comprehensive credit-based billing system for the ScholarLink Student Pilot platform with Stripe integration, JWT authentication, and auditable ledger system.

## Features

- **Credit-Based Billing**: $1 = 1000 credits with precise decimal accounting
- **JWT Authentication**: RS256 token validation with timing-safe operations
- **Stripe Integration**: Secure payment processing with webhook handling
- **Auditable Ledger**: Complete transaction history and usage tracking
- **Rate Cards**: Flexible pricing with OpenAI model support (4x markup)
- **Credit Packages**: Progressive bonus system (5%-20% bonuses)
- **Production Ready**: Comprehensive error handling, logging, and monitoring

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication Required

- `POST /api/usage/reconcile` - Process token usage and charge credits
- `GET /api/users/profile` - Get user profile and balance
- `GET /api/ledger` - Get transaction history
- `POST /api/purchases` - Create credit purchase
- `GET /api/packages` - Get available credit packages

### Admin Only

- `POST /api/admin/users/:userId/adjust` - Adjust user balance
- `GET /api/admin/metrics` - Get service metrics

### Public

- `GET /health` - Health check
- `POST /webhooks/stripe` - Stripe webhook handler

## Configuration

Key environment variables:

```bash
DATABASE_URL=postgresql://localhost:5432/billing
JWT_PUBLIC_KEY=your_rsa_public_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Credit System

- **Conversion**: $1.00 = 1000 credits
- **Precision**: 18 decimal places for accurate calculations
- **Packages**: 5 tiers with progressive bonuses (5%-20%)
- **Usage Tracking**: Real-time debit processing with idempotency

## Rate Card V1

OpenAI models with 4x markup:
- GPT-4o: 20 credits/1k input, 60 credits/1k output
- GPT-4o-mini: 0.6 credits/1k input, 2.4 credits/1k output
- GPT-4-turbo: 40 credits/1k input, 120 credits/1k output
- GPT-3.5-turbo: 2 credits/1k input, 6 credits/1k output

## Security Features

- **Timing-Safe Operations**: Prevents timing attacks
- **Request Validation**: Comprehensive input sanitization
- **Rate Limiting**: 100 requests/minute per user
- **CORS Protection**: Configurable origin policies
- **Audit Trail**: Complete ledger with correlation IDs

## Monitoring

- **Health Checks**: Database and service status
- **Metrics**: Request counts, error rates, usage statistics
- **Logging**: Structured JSON logs with correlation tracking
- **Alerting**: Integration ready for external monitoring

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Test
npm run test

# Database operations
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
```

## Architecture

- **Express.js**: REST API framework
- **Prisma**: Type-safe database ORM
- **Decimal.js**: Precise financial calculations
- **Pino**: High-performance logging
- **Helmet**: Security middleware
- **Zod**: Runtime type validation

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure all required environment variables
3. Run database migrations: `npm run db:migrate`
4. Start with: `npm start`

## License

Proprietary - ScholarLink Platform