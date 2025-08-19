// Purchase service for handling credit purchases via Stripe

import Stripe from 'stripe';
import { prisma, withTransaction } from './database';
import { addCreditsToUser } from './userService';
import {
  CreditPackage,
} from '@/types';
import { CREDIT_PACKAGES, appConfig } from '@/config';
import { decimal, toDbString } from '@/utils/decimal';
import pino from 'pino';

const logger = pino({ name: 'purchase-service' });

// Initialize Stripe if configured
let stripe: Stripe | null = null;
if (appConfig.STRIPE_SECRET_KEY) {
  stripe = new Stripe(appConfig.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Get available credit packages
 */
export function getAvailablePackages(): CreditPackage[] {
  return CREDIT_PACKAGES.map(pkg => ({
    code: pkg.code,
    name: pkg.name,
    usdCents: pkg.usdCents,
    credits: pkg.credits,
    bonusPercentage: pkg.bonusPercentage,
  }));
}

/**
 * Get package by code
 */
export function getPackageByCode(code: string): CreditPackage | null {
  const pkg = CREDIT_PACKAGES.find(p => p.code === code);
  return pkg ? {
    code: pkg.code,
    name: pkg.name,
    usdCents: pkg.usdCents,
    credits: pkg.credits,
    bonusPercentage: pkg.bonusPercentage,
  } : null;
}

/**
 * Create purchase and return payment URL
 */
export async function createPurchase(
  userId: string,
  request: PurchaseRequest
): Promise<PurchaseResponse> {
  const packageInfo = getPackageByCode(request.packageCode);
  if (!packageInfo) {
    throw new Error(`Invalid package code: ${request.packageCode}`);
  }

  if (!stripe) {
    throw new Error('Stripe not configured - cannot process purchases');
  }

  try {
    // Create pending purchase in database
    const purchase = await prisma.purchase.create({
      data: {
        userId,
        packageCode: packageInfo.code,
        usdCents: packageInfo.usdCents,
        creditsGranted: createDecimal(packageInfo.credits).toString(),
        provider: 'stripe',
        providerRef: '', // Will be updated with Stripe session ID
        status: 'pending',
      },
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: undefined, // Let user enter email
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${packageInfo.name} Credits`,
              description: `${packageInfo.credits.toLocaleString()} credits${
                packageInfo.bonusPercentage 
                  ? ` (includes ${packageInfo.bonusPercentage}% bonus)` 
                  : ''
              }`,
            },
            unit_amount: packageInfo.usdCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appConfig.CORS_ALLOWED_ORIGINS[0]}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appConfig.CORS_ALLOWED_ORIGINS[0]}/billing/cancel`,
      metadata: {
        purchaseId: purchase.id,
        userId,
        packageCode: packageInfo.code,
      },
    });

    // Update purchase with Stripe session ID
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { providerRef: session.id },
    });

    logger.info(
      {
        purchaseId: purchase.id,
        userId,
        packageCode: packageInfo.code,
        amount: packageInfo.usdCents,
        stripeSessionId: session.id,
      },
      'Purchase created successfully'
    );

    return {
      purchaseId: purchase.id,
      paymentUrl: session.url!,
      status: 'pending',
    };
  } catch (error) {
    logger.error(
      { error, userId, packageCode: request.packageCode },
      'Failed to create purchase'
    );
    throw error;
  }
}

/**
 * Handle successful Stripe webhook
 */
export async function handleStripeWebhook(
  event: Stripe.Event
): Promise<void> {
  logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook');

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        logger.info({ eventType: event.type }, 'Unhandled webhook event type');
    }
  } catch (error) {
    logger.error({ error, eventType: event.type }, 'Failed to process webhook');
    throw error;
  }
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const purchaseId = session.metadata?.purchaseId;
  const userId = session.metadata?.userId;

  if (!purchaseId || !userId) {
    logger.error({ sessionId: session.id }, 'Missing metadata in webhook');
    return;
  }

  await withTransaction(async (tx) => {
    // Find the purchase
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      logger.error({ purchaseId }, 'Purchase not found for webhook');
      return;
    }

    if (purchase.status === 'succeeded') {
      logger.info({ purchaseId }, 'Purchase already processed');
      return;
    }

    // Update purchase status
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        status: 'succeeded',
        updatedAt: new Date(),
      },
    });

    // Add credits to user account
    const creditsToAdd = createDecimal(purchase.creditsGranted.toString());
    const { newBalance, ledgerEntryId } = await addCreditsToUser(
      userId,
      creditsToAdd,
      `Credit purchase: ${purchase.packageCode}`,
      {
        purchaseId: purchase.id,
        provider: 'stripe',
        providerRef: session.id,
        packageCode: purchase.packageCode,
        usdCents: purchase.usdCents,
      }
    );

    logger.info(
      {
        purchaseId,
        userId,
        creditsAdded: creditsToAdd.toString(),
        newBalance: newBalance.toString(),
        ledgerEntryId,
      },
      'Purchase completed successfully'
    );
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  // Payment intent doesn't have our metadata, so we need to find the purchase
  // by matching the amount or other identifying information
  logger.warn(
    { paymentIntentId: paymentIntent.id },
    'Payment failed - purchase remains pending'
  );
}

/**
 * Get purchase history for user
 */
export async function getUserPurchases(
  userId: string,
  limit: number = 50,
  cursor?: string
): Promise<{
  purchases: Array<{
    id: string;
    packageCode: string;
    usdCents: number;
    creditsGranted: string;
    status: string;
    createdAt: string;
  }>;
  hasMore: boolean;
  nextCursor?: string;
}> {
  const whereClause: any = { userId };
  
  if (cursor) {
    whereClause.createdAt = { lt: new Date(cursor) };
  }

  const purchases = await prisma.purchase.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    select: {
      id: true,
      packageCode: true,
      usdCents: true,
      creditsGranted: true,
      status: true,
      createdAt: true,
    },
  });

  const hasMore = purchases.length > limit;
  const items = hasMore ? purchases.slice(0, -1) : purchases;

  return {
    purchases: items.map(p => ({
      id: p.id,
      packageCode: p.packageCode,
      usdCents: p.usdCents,
      creditsGranted: formatCreditsForStorage(createDecimal(p.creditsGranted.toString())),
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined,
  };
}