import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.DOCHUB_API_KEY || 'dev-api-key';
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3003';
const A8_ENDPOINT = process.env.A8_ENDPOINT || 'https://auto-com-center-jamarrlmayes.replit.app/events';
const startTime = Date.now();

app.use(express.json());

const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
};

const ageGateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const age = parseInt(req.body?.age || req.query?.age as string || '0');
  const declaredMinor = req.body?.is_minor === true;
  const isMinor = (age > 0 && age < 18) || declaredMinor;
  
  (req as any).privacyContext = {
    doNotSell: isMinor,
    isMinor,
    trackingDisabled: isMinor,
    privacyEnforced: isMinor
  };
  
  if (isMinor) {
    res.setHeader('X-Do-Not-Sell', 'true');
    res.setHeader('X-Privacy-Enforced', 'true');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self'; img-src 'self' data:; " +
      "connect-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
    );
    console.log(`[DocumentHub] Privacy enforced for minor user`);
    logPrivacyEvent('privacy_enforced', { reason: 'under_18' });
  }
  next();
};

async function logPrivacyEvent(eventType: string, data: any): Promise<void> {
  try {
    await fetch(A8_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        app_id: 'document-hub-v2',
        timestamp: new Date().toISOString(),
        data
      })
    });
  } catch (err) {
    console.log('[DocumentHub] Failed to log privacy event (non-blocking)');
  }
}

const documents: Map<string, any> = new Map();
let docIdCounter = 1;

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'document-hub-v2',
    version: '2.0.0',
    uptime_s: Math.floor((Date.now() - startTime) / 1000),
    status: 'healthy'
  });
});

app.post('/upload', apiKeyAuth, ageGateMiddleware, async (req: Request, res: Response) => {
  const { user_id, filename, mime, size, content_base64, age, is_minor } = req.body;
  
  if (!user_id || !filename) {
    return res.status(400).json({ error: 'user_id and filename required' });
  }

  const privacyContext = (req as any).privacyContext;
  const document_id = `doc_${docIdCounter++}`;
  const document = {
    document_id,
    user_id,
    filename,
    mime: mime || 'application/octet-stream',
    size: size || (content_base64 ? Buffer.from(content_base64, 'base64').length : 0),
    status: 'uploaded',
    do_not_sell: privacyContext?.doNotSell || false,
    created_at: new Date().toISOString()
  };
  documents.set(document_id, document);

  try {
    await fetch(`${ORCHESTRATOR_URL}/events/document_uploaded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id,
        user_id,
        mime: document.mime,
        size: document.size,
        filename,
        privacy_context: privacyContext
      })
    });
  } catch (err) {
    console.log('[DocumentHub] Orchestrator notification failed (non-blocking):', err);
  }

  res.status(201).json({
    document_id,
    mime: document.mime,
    size: document.size,
    user_id,
    status: 'uploaded',
    privacy_enforced: privacyContext?.privacyEnforced || false
  });
});

app.post('/webhooks/test', apiKeyAuth, (req: Request, res: Response) => {
  console.log('[DocumentHub] Webhook test received:', req.body);
  res.json({ received: true, timestamp: new Date().toISOString() });
});

app.get('/documents/:id', apiKeyAuth, (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

app.listen(PORT, () => {
  console.log(`[DocumentHub v2] Running on port ${PORT}`);
});
