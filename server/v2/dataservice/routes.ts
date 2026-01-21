import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { 
  users, providers, scholarships, documents, creditLedger,
  insertUserSchema, insertProviderSchema, insertScholarshipSchema,
  insertDocumentSchema, insertCreditLedgerSchema
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware, optionalAuth } from './middleware/auth';
import { ferpaGuard } from './middleware/ferpa';
import { auditMiddleware, logAuditTrail } from './middleware/audit';
import * as crypto from 'crypto';

export const dataRoutes = Router();

dataRoutes.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await db.select().from(users).limit(limit).offset(offset);
    res.json({ data: result, meta: { limit, offset } });
  } catch (error) {
    console.error('[DataService] Error listing users:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' } });
  }
});

dataRoutes.post('/users', authMiddleware, auditMiddleware('users'), async (req: Request, res: Response) => {
  try {
    const validated = insertUserSchema.parse(req.body);
    const [user] = await db.insert(users).values(validated).returning();
    res.status(201).json(user);
  } catch (error) {
    console.error('[DataService] Error creating user:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid user data' } });
  }
});

dataRoutes.get('/users/:id', authMiddleware, ferpaGuard, async (req: Request, res: Response) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('[DataService] Error getting user:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } });
  }
});

dataRoutes.put('/users/:id', authMiddleware, ferpaGuard, auditMiddleware('users'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    req.auditBefore = existing;
    
    const validated = insertUserSchema.partial().parse(req.body);
    const [updated] = await db.update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, req.params.id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('[DataService] Error updating user:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid user data' } });
  }
});

dataRoutes.delete('/users/:id', authMiddleware, ferpaGuard, auditMiddleware('users'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    req.auditBefore = existing;
    
    await db.delete(users).where(eq(users.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('[DataService] Error deleting user:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' } });
  }
});

dataRoutes.get('/providers', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await db.select().from(providers).limit(limit).offset(offset);
    res.json({ data: result, meta: { limit, offset } });
  } catch (error) {
    console.error('[DataService] Error listing providers:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list providers' } });
  }
});

dataRoutes.post('/providers', authMiddleware, auditMiddleware('providers'), async (req: Request, res: Response) => {
  try {
    const validated = insertProviderSchema.parse(req.body);
    const [provider] = await db.insert(providers).values(validated).returning();
    res.status(201).json(provider);
  } catch (error) {
    console.error('[DataService] Error creating provider:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid provider data' } });
  }
});

dataRoutes.get('/providers/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const [provider] = await db.select().from(providers).where(eq(providers.id, req.params.id));
    if (!provider) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
      return;
    }
    res.json(provider);
  } catch (error) {
    console.error('[DataService] Error getting provider:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get provider' } });
  }
});

dataRoutes.put('/providers/:id', authMiddleware, auditMiddleware('providers'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(providers).where(eq(providers.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
      return;
    }
    req.auditBefore = existing;
    
    const validated = insertProviderSchema.partial().parse(req.body);
    const [updated] = await db.update(providers)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(providers.id, req.params.id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('[DataService] Error updating provider:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid provider data' } });
  }
});

dataRoutes.delete('/providers/:id', authMiddleware, auditMiddleware('providers'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(providers).where(eq(providers.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Provider not found' } });
      return;
    }
    req.auditBefore = existing;
    
    await db.delete(providers).where(eq(providers.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('[DataService] Error deleting provider:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete provider' } });
  }
});

dataRoutes.get('/scholarships', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await db.select().from(scholarships).limit(limit).offset(offset);
    res.json({ data: result, meta: { limit, offset } });
  } catch (error) {
    console.error('[DataService] Error listing scholarships:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list scholarships' } });
  }
});

dataRoutes.post('/scholarships', authMiddleware, auditMiddleware('scholarships'), async (req: Request, res: Response) => {
  try {
    const validated = insertScholarshipSchema.parse(req.body);
    const [scholarship] = await db.insert(scholarships).values(validated).returning();
    res.status(201).json(scholarship);
  } catch (error) {
    console.error('[DataService] Error creating scholarship:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid scholarship data' } });
  }
});

dataRoutes.get('/scholarships/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const [scholarship] = await db.select().from(scholarships).where(eq(scholarships.id, req.params.id));
    if (!scholarship) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scholarship not found' } });
      return;
    }
    res.json(scholarship);
  } catch (error) {
    console.error('[DataService] Error getting scholarship:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get scholarship' } });
  }
});

dataRoutes.put('/scholarships/:id', authMiddleware, auditMiddleware('scholarships'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(scholarships).where(eq(scholarships.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scholarship not found' } });
      return;
    }
    req.auditBefore = existing;
    
    const validated = insertScholarshipSchema.partial().parse(req.body);
    const [updated] = await db.update(scholarships)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(scholarships.id, req.params.id))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('[DataService] Error updating scholarship:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid scholarship data' } });
  }
});

dataRoutes.delete('/scholarships/:id', authMiddleware, auditMiddleware('scholarships'), async (req: Request, res: Response) => {
  try {
    const [existing] = await db.select().from(scholarships).where(eq(scholarships.id, req.params.id));
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scholarship not found' } });
      return;
    }
    req.auditBefore = existing;
    
    await db.delete(scholarships).where(eq(scholarships.id, req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error('[DataService] Error deleting scholarship:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete scholarship' } });
  }
});

dataRoutes.post('/uploads', authMiddleware, ferpaGuard, auditMiddleware('uploads'), async (req: Request, res: Response) => {
  try {
    const validated = insertDocumentSchema.parse({
      ...req.body,
      uploadedAt: new Date(),
    });
    const [doc] = await db.insert(documents).values(validated).returning();
    res.status(201).json({ upload_id: doc.id, ...doc });
  } catch (error) {
    console.error('[DataService] Error creating upload:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid upload data' } });
  }
});

dataRoutes.get('/uploads/:id', authMiddleware, ferpaGuard, async (req: Request, res: Response) => {
  try {
    const [doc] = await db.select().from(documents).where(eq(documents.id, req.params.id));
    if (!doc) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Upload not found' } });
      return;
    }
    res.json(doc);
  } catch (error) {
    console.error('[DataService] Error getting upload:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get upload' } });
  }
});

dataRoutes.post('/ledgers', authMiddleware, auditMiddleware('ledgers'), async (req: Request, res: Response) => {
  try {
    const validated = insertCreditLedgerSchema.parse(req.body);
    
    if (req.body.balanced === true) {
      const sum = BigInt(validated.amountMillicredits || 0);
      if (sum !== 0n) {
        res.status(400).json({ 
          error: { code: 'ZERO_SUM_VIOLATION', message: 'Balanced ledger entries must sum to zero' } 
        });
        return;
      }
    }
    
    const [entry] = await db.insert(creditLedger).values(validated).returning();
    res.status(201).json(entry);
  } catch (error) {
    console.error('[DataService] Error creating ledger entry:', error);
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ledger data' } });
  }
});

dataRoutes.get('/ledgers/reconcile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const traceId = req.query.trace_id as string;
    if (!traceId) {
      res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'trace_id is required' } });
      return;
    }
    
    const entries = await db.select().from(creditLedger)
      .where(sql`${creditLedger.metadata}->>'trace_id' = ${traceId}`);
    
    const sum = entries.reduce((acc, e) => acc + BigInt(e.amountMillicredits), 0n);
    
    res.json({
      trace_id: traceId,
      entries: entries.length,
      sum: sum.toString(),
      balanced: sum === 0n,
    });
  } catch (error) {
    console.error('[DataService] Error reconciling ledger:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reconcile' } });
  }
});
