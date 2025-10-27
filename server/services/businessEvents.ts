import { db } from "../db";
import { businessEvents, type InsertBusinessEvent } from "@shared/schema";
import { randomUUID } from "crypto";
import { env } from "../environment";

/**
 * Business Events Service
 * 
 * Emits business events to the business_events table for KPI tracking,
 * executive dashboard, and cross-app analytics.
 * 
 * Events are emitted fire-and-forget to avoid blocking request paths.
 */

const APP_NAME = "student_pilot";
const ENVIRONMENT = env.NODE_ENV || "development";

interface EmitEventOptions {
  eventName: string;
  actorType: "student" | "provider" | "system" | "admin";
  actorId?: string;
  orgId?: string;
  sessionId?: string;
  requestId?: string;
  properties?: Record<string, any>;
}

/**
 * Emit a business event to the business_events table
 * Fire-and-forget with error capture to avoid blocking
 */
export async function emitBusinessEvent(options: EmitEventOptions): Promise<void> {
  try {
    const event: InsertBusinessEvent = {
      requestId: options.requestId || randomUUID(),
      app: APP_NAME,
      env: ENVIRONMENT,
      eventName: options.eventName,
      ts: new Date(),
      actorType: options.actorType,
      actorId: options.actorId,
      orgId: options.orgId,
      sessionId: options.sessionId,
      properties: options.properties || null,
    };

    // Fire-and-forget: don't await to avoid blocking
    db.insert(businessEvents).values(event).execute().catch((error) => {
      console.error(`❌ Failed to emit business event: ${options.eventName}`, error);
    });
  } catch (error) {
    // Catch errors to prevent blocking request flow
    console.error(`❌ Error emitting business event: ${options.eventName}`, error);
  }
}

/**
 * Student-specific events
 */
export const StudentEvents = {
  signup: (userId: string, sessionId: string, requestId: string, properties?: Record<string, any>) =>
    emitBusinessEvent({
      eventName: "student_signup",
      actorType: "student",
      actorId: userId,
      sessionId,
      requestId,
      properties,
    }),

  profileCompleted: (userId: string, studentId: string, completionPercentage: number, requestId: string) =>
    emitBusinessEvent({
      eventName: "profile_completed",
      actorType: "student",
      actorId: userId,
      requestId,
      properties: {
        studentId,
        completionPercentage,
      },
    }),

  matchViewed: (userId: string, matchId: string, scholarshipId: string, matchScore: number, requestId: string) =>
    emitBusinessEvent({
      eventName: "match_viewed",
      actorType: "student",
      actorId: userId,
      requestId,
      properties: {
        matchId,
        scholarshipId,
        matchScore,
      },
    }),

  creditPurchased: (userId: string, amount: number, usdCents: number, requestId: string) =>
    emitBusinessEvent({
      eventName: "credit_purchased",
      actorType: "student",
      actorId: userId,
      requestId,
      properties: {
        creditsAmount: amount,
        usdCents,
      },
    }),

  creditSpent: (userId: string, amount: number, operation: string, requestId: string) =>
    emitBusinessEvent({
      eventName: "credit_spent",
      actorType: "student",
      actorId: userId,
      requestId,
      properties: {
        creditsAmount: amount,
        operation,
      },
    }),

  applicationSubmitted: (userId: string, applicationId: string, scholarshipId: string, requestId: string) =>
    emitBusinessEvent({
      eventName: "application_submitted",
      actorType: "student",
      actorId: userId,
      requestId,
      properties: {
        applicationId,
        scholarshipId,
      },
    }),
};

/**
 * System/KPI events
 */
export const SystemEvents = {
  kpiMissingData: (metric: string, reason: string, requestId: string) =>
    emitBusinessEvent({
      eventName: "kpi_missing_data",
      actorType: "system",
      requestId,
      properties: {
        metric,
        reason,
      },
    }),

  kpiSloBreach: (service: string, metric: string, threshold: number, actual: number, requestId: string) =>
    emitBusinessEvent({
      eventName: "kpi_slo_breach",
      actorType: "system",
      requestId,
      properties: {
        service,
        metric,
        threshold,
        actual,
      },
    }),

  schedulerJobRun: (jobName: string, status: "started" | "completed" | "failed", durationMs?: number, requestId?: string) =>
    emitBusinessEvent({
      eventName: "scheduler_job_run",
      actorType: "system",
      requestId: requestId || randomUUID(),
      properties: {
        jobName,
        status,
        durationMs,
      },
    }),
};
