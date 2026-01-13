import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3003;
const DATASERVICE_URL = process.env.DATASERVICE_URL || 'http://localhost:3001';
const DATASERVICE_API_KEY = process.env.DATASERVICE_API_KEY || 'dev-api-key';
const startTime = Date.now();

app.use(express.json());

const activationStates: Map<string, any> = new Map();
const processingQueue: any[] = [];

const ageGateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const age = req.body.age || req.query.age;
  if (age && parseInt(age) < 18) {
    res.setHeader('X-Do-Not-Sell', 'true');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self'; img-src 'self' data:; " +
      "connect-src 'self'; frame-ancestors 'none';"
    );
    (req as any).privacyEnforced = true;
    (req as any).doNotSell = true;
    console.log('[Orchestrator] Privacy enforced for under-18 user');
  }
  next();
};

app.use(ageGateMiddleware);

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'onboarding-orchestrator-v2',
    version: '2.0.0',
    uptime_s: Math.floor((Date.now() - startTime) / 1000),
    status: 'healthy',
    queue_size: processingQueue.length
  });
});

app.get('/onboarding', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Scholar AI - Get Started</title></head>
    <body>
      <h1>Welcome to Scholar AI Advisor</h1>
      <p>Upload your transcript or past essay to unlock your personalized dashboard.</p>
      <form id="upload-form" enctype="multipart/form-data">
        <input type="file" name="document" accept=".pdf,.doc,.docx,.txt" required />
        <button type="submit">Upload & Analyze</button>
      </form>
      <p><small>AI tools are for editing and discovery only; users are responsible for academic integrity.</small></p>
    </body>
    </html>
  `);
});

function analyzeDocumentNLP(content: string): any {
  const themes = [];
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('community') || contentLower.includes('volunteer')) {
    themes.push('community_service');
  }
  if (contentLower.includes('stem') || contentLower.includes('science') || contentLower.includes('engineering')) {
    themes.push('stem_focus');
  }
  if (contentLower.includes('leadership') || contentLower.includes('president') || contentLower.includes('captain')) {
    themes.push('leadership');
  }
  if (contentLower.includes('first-generation') || contentLower.includes('first generation')) {
    themes.push('first_gen');
  }
  if (contentLower.includes('financial') || contentLower.includes('hardship')) {
    themes.push('financial_need');
  }

  return {
    mission_fit: themes.length > 0 ? 'detected' : 'pending',
    themes,
    implicit_fit_score: Math.min(themes.length * 20, 100),
    analysis_timestamp: new Date().toISOString()
  };
}

app.post('/events/document_uploaded', async (req: Request, res: Response) => {
  const { document_id, user_id, mime, size, filename } = req.body;
  
  console.log(`[Orchestrator] Processing document ${document_id} for user ${user_id}`);
  
  const mockContent = `Sample document content for ${filename}. 
    This student has shown leadership in community service programs 
    and demonstrates a strong STEM focus with first-generation college aspirations.`;
  
  const nlpResult = analyzeDocumentNLP(mockContent);
  
  const activationState = {
    user_id,
    document_id,
    status: 'ready',
    derived_features: nlpResult,
    processed_at: new Date().toISOString()
  };
  activationStates.set(user_id, activationState);

  try {
    await fetch(`${DATASERVICE_URL}/users/${user_id}/activation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': DATASERVICE_API_KEY
      },
      body: JSON.stringify({
        activation_status: 'ready',
        derived_features: nlpResult
      })
    });
  } catch (err) {
    console.log('[Orchestrator] DataService update failed (non-blocking):', err);
  }

  res.json({
    status: 'processed',
    document_id,
    user_id,
    derived_features: nlpResult
  });
});

app.get('/activation/status', (req: Request, res: Response) => {
  const user_id = req.query.user_id as string;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }
  
  const state = activationStates.get(user_id);
  if (!state) {
    return res.json({ user_id, status: 'pending', message: 'Upload a document to begin' });
  }
  
  res.json(state);
});

app.listen(PORT, () => {
  console.log(`[OnboardingOrchestrator v2] Running on port ${PORT}`);
});
