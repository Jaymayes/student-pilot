import { db } from "./db";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb, boolean, integer, index } from "drizzle-orm/pg-core";
import { and, gte, eq, gt, lt, lte, inArray } from "drizzle-orm";

// Webhook Disaster Recovery and Event Replay System
// Persists all verified Stripe events for replay and dead-letter queue handling

export const stripeEvents = pgTable(
  "stripe_events",
  {
    id: text("id").primaryKey(), // Stripe event ID (evt_xxx)
    type: text("type").notNull(), // checkout.session.completed, etc.
    livemode: boolean("livemode").notNull(),
    apiVersion: text("api_version"),
    rawPayload: jsonb("raw_payload").notNull(), // Full Stripe event object
    signature: text("signature").notNull(), // Webhook signature for verification
    processed: boolean("processed").default(false),
    processedAt: timestamp("processed_at"),
    retryCount: integer("retry_count").default(0),
    lastRetryAt: timestamp("last_retry_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_stripe_events_type").on(table.type),
    index("idx_stripe_events_processed").on(table.processed),
    index("idx_stripe_events_created_at").on(table.createdAt),
  ]
);

export const stripeEventDeadLetter = pgTable(
  "stripe_event_dead_letter",
  {
    id: text("id").primaryKey(),
    originalEventId: text("original_event_id").notNull(),
    failureReason: text("failure_reason").notNull(),
    retryAttempts: integer("retry_attempts").notNull(),
    lastError: text("last_error"),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export class WebhookDR {
  
  // Maximum retry attempts before moving to dead letter queue
  static readonly MAX_RETRY_ATTEMPTS = 5;
  
  // Backoff strategy: 30s, 2min, 10min, 30min, 2hr
  static readonly RETRY_DELAYS = [30, 120, 600, 1800, 7200]; // seconds
  
  /**
   * Persist verified Stripe event to database for replay capability
   */
  static async persistStripeEvent(
    eventId: string,
    eventType: string,
    livemode: boolean,
    apiVersion: string,
    rawPayload: any,
    signature: string
  ): Promise<void> {
    try {
      await db
        .insert(stripeEvents)
        .values({
          id: eventId,
          type: eventType,
          livemode,
          apiVersion,
          rawPayload,
          signature,
          processed: false,
        })
        .onConflictDoNothing(); // Idempotent - ignore duplicates
        
    } catch (error: any) {
      console.error('Failed to persist Stripe event:', {
        eventId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Mark event as successfully processed
   */
  static async markEventProcessed(eventId: string): Promise<void> {
    await db
      .update(stripeEvents)
      .set({
        processed: true,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stripeEvents.id, eventId));
  }
  
  /**
   * Record processing failure and increment retry count
   */
  static async recordEventFailure(
    eventId: string,
    errorMessage: string
  ): Promise<void> {
    await db
      .update(stripeEvents)
      .set({
        retryCount: sql`retry_count + 1`,
        lastRetryAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(stripeEvents.id, eventId));
  }
  
  /**
   * Move persistently failing events to dead letter queue
   */
  static async moveToDeadLetterQueue(eventId: string): Promise<void> {
    // Get the original event
    const [event] = await db
      .select()
      .from(stripeEvents)
      .where(eq(stripeEvents.id, eventId));
    
    if (!event) {
      throw new Error(`Event ${eventId} not found for dead letter queue`);
    }
    
    // Insert into dead letter queue
    await db.insert(stripeEventDeadLetter).values({
      id: `dlq_${eventId}`,
      originalEventId: eventId,
      failureReason: event.errorMessage || 'Max retries exceeded',
      retryAttempts: event.retryCount || 0,
      lastError: event.errorMessage,
      rawPayload: event.rawPayload,
    });
    
    // Mark original event as processed (but failed)
    await this.markEventProcessed(eventId);
    
    console.error('Stripe event moved to dead letter queue:', {
      eventId,
      retryAttempts: event.retryCount,
      lastError: event.errorMessage
    });
  }
  
  /**
   * Get unprocessed events for retry processing
   */
  static async getUnprocessedEvents(limit: number = 50): Promise<any[]> {
    return await db
      .select()
      .from(stripeEvents)
      .where(
        and(
          eq(stripeEvents.processed, false),
          lt(stripeEvents.retryCount, this.MAX_RETRY_ATTEMPTS)
        )
      )
      .orderBy(stripeEvents.createdAt)
      .limit(limit);
  }
  
  /**
   * Replay events by ID or time range (for disaster recovery)
   */
  static async replayEvents(options: {
    eventIds?: string[];
    startTime?: Date;
    endTime?: Date;
    eventTypes?: string[];
    dryRun?: boolean;
  } = {}): Promise<{
    eventsFound: number;
    eventsReplayed: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    
    let query = db.select().from(stripeEvents);
    const conditions = [];
    
    if (options.eventIds?.length) {
      conditions.push(inArray(stripeEvents.id, options.eventIds));
    }
    
    if (options.startTime) {
      conditions.push(gte(stripeEvents.createdAt, options.startTime));
    }
    
    if (options.endTime) {
      conditions.push(lte(stripeEvents.createdAt, options.endTime));
    }
    
    if (options.eventTypes?.length) {
      conditions.push(inArray(stripeEvents.type, options.eventTypes));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const events = await query.orderBy(stripeEvents.createdAt);
    
    const results = {
      eventsFound: events.length,
      eventsReplayed: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };
    
    if (options.dryRun) {
      console.log(`DRY RUN: Would replay ${events.length} events`);
      return results;
    }
    
    // Process each event
    for (const event of events) {
      try {
        // Re-process the event using your webhook handler
        await this.processWebhookEvent(event.rawPayload);
        results.eventsReplayed++;
        
        console.log(`Replayed event ${event.id} (${event.type})`);
        
      } catch (error: any) {
        results.errors.push({
          eventId: event.id,
          error: error.message
        });
        
        console.error(`Failed to replay event ${event.id}:`, error.message);
      }
    }
    
    return results;
  }
  
  /**
   * Process a webhook event (implement your actual webhook logic here)
   */
  private static async processWebhookEvent(eventData: any): Promise<void> {
    // This should call your actual webhook processing logic
    // For example, if you have a webhook processor service:
    
    const { BillingService } = await import('./billing');
    const billingService = new BillingService();
    
    switch (eventData.type) {
      case 'checkout.session.completed':
        // await billingService.handleCheckoutCompleted(eventData.data.object); // TODO: Implement method
        break;
        
      case 'invoice.payment_succeeded':
        // await billingService.handleInvoicePaymentSucceeded(eventData.data.object); // TODO: Implement method
        break;
        
      default:
        console.log(`Unhandled event type: ${eventData.type}`);
    }
  }
  
  /**
   * Clean up old processed events (retention policy)
   */
  static async cleanupOldEvents(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await db
      .delete(stripeEvents)
      .where(
        and(
          eq(stripeEvents.processed, true),
          lt(stripeEvents.createdAt, cutoffDate)
        )
      );
    
    console.log(`Cleaned up ${result.rowCount || 0} old Stripe events`);
    return result.rowCount || 0;
  }
  
  /**
   * Get webhook processing statistics
   */
  static async getWebhookStats(days: number = 7): Promise<{
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    deadLetterEvents: number;
    processingRate: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stripeEvents)
      .where(gte(stripeEvents.createdAt, since));
    
    const [processedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stripeEvents)
      .where(
        and(
          gte(stripeEvents.createdAt, since),
          eq(stripeEvents.processed, true)
        )
      );
    
    const [failedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stripeEvents)
      .where(
        and(
          gte(stripeEvents.createdAt, since),
          eq(stripeEvents.processed, false),
          gt(stripeEvents.retryCount, 0)
        )
      );
    
    const [deadLetterResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stripeEventDeadLetter)
      .where(gte(stripeEventDeadLetter.createdAt, since));
    
    const total = totalResult.count;
    const processed = processedResult.count;
    const failed = failedResult.count;
    const deadLetter = deadLetterResult.count;
    
    return {
      totalEvents: total,
      processedEvents: processed,
      failedEvents: failed,
      deadLetterEvents: deadLetter,
      processingRate: total > 0 ? (processed / total) * 100 : 0
    };
  }
}

// Export schema for migrations
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type StripeEventDeadLetter = typeof stripeEventDeadLetter.$inferSelect;