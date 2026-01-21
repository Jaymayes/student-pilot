import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createGuest, createUpload, scoreUpload, runCompleteFlow } from './orchestrator';
import { DocumentMeta } from './nlpScoring';

export const onboardingRouter = Router();

const guestSchema = z.object({
  email: z.string().email()
});

const uploadSchema = z.object({
  guest_id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  type: z.enum(['transcript', 'resume', 'essay', 'letter_of_recommendation', 'other'])
});

const scoreSchema = z.object({
  upload_id: z.string().min(1)
});

const completeFlowSchema = z.object({
  email: z.string().email(),
  documentMeta: z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().positive(),
    type: z.enum(['transcript', 'resume', 'essay', 'letter_of_recommendation', 'other'])
  })
});

onboardingRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'onboarding-orchestrator',
    timestamp: new Date().toISOString()
  });
});

onboardingRouter.get('/readyz', (_req: Request, res: Response) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

onboardingRouter.post('/guest', async (req: Request, res: Response) => {
  try {
    const validated = guestSchema.parse(req.body);
    const traceId = req.headers['x-trace-id'] as string | undefined;
    
    const result = await createGuest(validated.email, traceId);
    
    res.status(201).json({
      guest_id: result.guestId,
      email: result.email
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors }
      });
      return;
    }
    console.error('[Onboarding] Guest creation failed:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create guest' }
    });
  }
});

onboardingRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const validated = uploadSchema.parse(req.body);
    const traceId = req.headers['x-trace-id'] as string | undefined;
    
    const documentMeta: DocumentMeta = {
      filename: validated.filename,
      mimeType: validated.mimeType,
      size: validated.size,
      type: validated.type
    };
    
    const result = await createUpload(validated.guest_id, documentMeta, traceId);
    
    res.status(201).json({
      upload_id: result.uploadId,
      guest_id: result.guestId,
      document_type: result.documentType
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors }
      });
      return;
    }
    if (error instanceof Error && error.message === 'Guest user not found') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Guest user not found' }
      });
      return;
    }
    console.error('[Onboarding] Upload creation failed:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create upload' }
    });
  }
});

onboardingRouter.post('/score', async (req: Request, res: Response) => {
  try {
    const validated = scoreSchema.parse(req.body);
    const traceId = req.headers['x-trace-id'] as string | undefined;
    
    const result = await scoreUpload(validated.upload_id, traceId);
    
    res.json({
      upload_id: result.uploadId,
      score: result.score,
      confidence: result.confidence,
      match_suggestions: result.matchSuggestions,
      processing_time_ms: result.processingTimeMs
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors }
      });
      return;
    }
    if (error instanceof Error && error.message === 'Upload not found') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Upload not found' }
      });
      return;
    }
    console.error('[Onboarding] Scoring failed:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to score document' }
    });
  }
});

onboardingRouter.post('/complete-flow', async (req: Request, res: Response) => {
  try {
    const validated = completeFlowSchema.parse(req.body);
    const traceId = req.headers['x-trace-id'] as string | undefined;
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
    
    const result = await runCompleteFlow(
      validated.email,
      validated.documentMeta as DocumentMeta,
      traceId,
      idempotencyKey
    );
    
    if (result.status === 'failed') {
      res.status(500).json({
        error: { code: 'FLOW_FAILED', message: result.error },
        guest_id: result.guestId || null,
        upload_id: result.uploadId || null,
        score: result.score,
        status: result.status
      });
      return;
    }
    
    res.status(result.status === 'completed' ? 201 : 207).json({
      guest_id: result.guestId,
      upload_id: result.uploadId,
      score: result.score,
      status: result.status,
      ...(result.error && { warning: result.error })
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors }
      });
      return;
    }
    console.error('[Onboarding] Complete flow failed:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding flow' }
    });
  }
});

export default onboardingRouter;
