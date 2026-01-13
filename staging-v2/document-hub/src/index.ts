import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3002;
const API_KEY = process.env.DOCHUB_API_KEY || 'dev-api-key';
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3003';
const startTime = Date.now();

app.use(express.json());

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

app.post('/upload', async (req: Request, res: Response) => {
  const { user_id, filename, mime, size, content_base64 } = req.body;
  
  if (!user_id || !filename) {
    return res.status(400).json({ error: 'user_id and filename required' });
  }

  const document_id = `doc_${docIdCounter++}`;
  const document = {
    document_id,
    user_id,
    filename,
    mime: mime || 'application/octet-stream',
    size: size || (content_base64 ? Buffer.from(content_base64, 'base64').length : 0),
    status: 'uploaded',
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
        filename
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
    status: 'uploaded'
  });
});

app.post('/webhooks/test', (req: Request, res: Response) => {
  console.log('[DocumentHub] Webhook test received:', req.body);
  res.json({ received: true, timestamp: new Date().toISOString() });
});

app.get('/documents/:id', (req: Request, res: Response) => {
  const doc = documents.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

app.listen(PORT, () => {
  console.log(`[DocumentHub v2] Running on port ${PORT}`);
});
