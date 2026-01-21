import { db } from '../../db';
import { users, documents, studentProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { telemetryClient } from '../../telemetry/telemetryClient';
import { scoreDocument, DocumentMeta, NLPScoreResult } from './nlpScoring';
import * as crypto from 'crypto';

export interface GuestCreationResult {
  guestId: string;
  email: string;
}

export interface UploadResult {
  uploadId: string;
  guestId: string;
  documentType: string;
}

export interface ScoreResult {
  uploadId: string;
  score: number;
  confidence: number;
  matchSuggestions: string[];
  processingTimeMs: number;
}

export interface CompleteFlowResult {
  guestId: string;
  uploadId: string;
  score: number;
  status: 'completed' | 'partial' | 'failed';
  error?: string;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 100;

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[Onboarding] ${operationName} attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  throw lastError;
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').substring(0, 16);
}

export async function createGuest(email: string, traceId?: string): Promise<GuestCreationResult> {
  console.log(`[Onboarding] Creating guest user, traceId=${traceId || 'none'}`);
  
  const [existingUser] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  
  if (existingUser) {
    emitTelemetry('GuestCreated', {
      guestId: existingUser.id,
      emailHash: hashEmail(email),
      source: 'onboarding',
      isExisting: true
    });
    
    return {
      guestId: existingUser.id,
      email: email.toLowerCase().trim()
    };
  }
  
  const [newUser] = await db.insert(users).values({
    email: email.toLowerCase().trim(),
    subscriptionStatus: 'inactive'
  }).returning();
  
  emitTelemetry('GuestCreated', {
    guestId: newUser.id,
    emailHash: hashEmail(email),
    source: 'onboarding',
    isExisting: false
  });
  
  return {
    guestId: newUser.id,
    email: email.toLowerCase().trim()
  };
}

export async function createUpload(
  guestId: string,
  documentMeta: DocumentMeta,
  traceId?: string
): Promise<UploadResult> {
  console.log(`[Onboarding] Creating upload for guest=${guestId}, traceId=${traceId || 'none'}`);
  
  const [user] = await db.select().from(users).where(eq(users.id, guestId));
  if (!user) {
    throw new Error('Guest user not found');
  }
  
  let [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, guestId));
  if (!profile) {
    const [newProfile] = await db.insert(studentProfiles).values({
      userId: guestId
    }).returning();
    profile = newProfile;
  }
  
  const [doc] = await db.insert(documents).values({
    studentId: profile.id,
    type: documentMeta.type,
    title: documentMeta.filename,
    fileName: documentMeta.filename,
    filePath: `/uploads/${guestId}/${documentMeta.filename}`,
    fileSize: documentMeta.size,
    mimeType: documentMeta.mimeType,
    category: getCategoryFromType(documentMeta.type)
  }).returning();
  
  emitTelemetry('DocumentUploaded', {
    guestId,
    uploadId: doc.id,
    documentType: documentMeta.type,
    mimeType: documentMeta.mimeType
  });
  
  return {
    uploadId: doc.id,
    guestId,
    documentType: documentMeta.type
  };
}

function getCategoryFromType(type: string): string {
  const categoryMap: Record<string, string> = {
    transcript: 'academic',
    resume: 'personal',
    essay: 'personal',
    letter_of_recommendation: 'academic',
    other: 'other'
  };
  return categoryMap[type] || 'other';
}

export async function scoreUpload(
  uploadId: string,
  traceId?: string
): Promise<ScoreResult> {
  console.log(`[Onboarding] Scoring upload=${uploadId}, traceId=${traceId || 'none'}`);
  
  const [doc] = await db.select().from(documents).where(eq(documents.id, uploadId));
  if (!doc) {
    throw new Error('Upload not found');
  }
  
  const documentMeta: DocumentMeta = {
    filename: doc.fileName,
    mimeType: doc.mimeType || 'application/octet-stream',
    size: doc.fileSize || 0,
    type: doc.type as DocumentMeta['type']
  };
  
  const nlpResult = await scoreDocument(uploadId, documentMeta);
  
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, doc.studentId));
  
  emitTelemetry('DocumentScored', {
    guestId: profile?.userId || 'unknown',
    uploadId,
    score: nlpResult.score,
    processingTimeMs: nlpResult.processingTimeMs
  });
  
  return {
    uploadId,
    score: nlpResult.score,
    confidence: nlpResult.confidence,
    matchSuggestions: nlpResult.matchSuggestions,
    processingTimeMs: nlpResult.processingTimeMs
  };
}

export async function runCompleteFlow(
  email: string,
  documentMeta: DocumentMeta,
  traceId?: string,
  idempotencyKey?: string
): Promise<CompleteFlowResult> {
  console.log(`[Onboarding] Running complete flow, traceId=${traceId || 'none'}, idempotencyKey=${idempotencyKey || 'none'}`);
  
  let guestId: string | null = null;
  let uploadId: string | null = null;
  let score: number = 0;
  
  try {
    const guestResult = await withRetry(
      () => createGuest(email, traceId),
      'createGuest'
    );
    guestId = guestResult.guestId;
    
    const uploadResult = await withRetry(
      () => createUpload(guestId!, documentMeta, traceId),
      'createUpload'
    );
    uploadId = uploadResult.uploadId;
    
    const scoreResult = await withRetry(
      () => scoreUpload(uploadId!, traceId),
      'scoreUpload'
    );
    score = scoreResult.score;
    
    return {
      guestId,
      uploadId,
      score,
      status: 'completed'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Onboarding] Complete flow failed:', errorMessage);
    
    if (guestId && uploadId) {
      return {
        guestId,
        uploadId,
        score: 0,
        status: 'partial',
        error: `Scoring failed: ${errorMessage}`
      };
    }
    
    if (guestId) {
      return {
        guestId,
        uploadId: '',
        score: 0,
        status: 'partial',
        error: `Upload failed: ${errorMessage}`
      };
    }
    
    return {
      guestId: '',
      uploadId: '',
      score: 0,
      status: 'failed',
      error: errorMessage
    };
  }
}

function emitTelemetry(eventName: string, data: Record<string, unknown>): void {
  try {
    telemetryClient.track(eventName, data);
  } catch (error) {
    console.warn(`[Onboarding] Telemetry emit failed for ${eventName}:`, error);
  }
}
