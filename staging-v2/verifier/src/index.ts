import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3004;
const startTime = Date.now();

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'saa-verifier-v2',
    version: '2.0.0',
    uptime_s: Math.floor((Date.now() - startTime) / 1000),
    status: 'healthy'
  });
});

app.post('/verify', (req: Request, res: Response) => {
  const { input, rubric } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'input required' });
  }

  const inputLength = input.length;
  const hasStructure = input.includes('.') && input.includes(' ');
  const wordCount = input.split(/\s+/).length;
  
  let score = 50;
  const reasons: string[] = [];

  if (wordCount > 100) {
    score += 20;
    reasons.push('Adequate length');
  } else {
    reasons.push('Consider expanding content');
  }

  if (hasStructure) {
    score += 15;
    reasons.push('Basic structure present');
  }

  if (rubric) {
    const rubricKeywords = rubric.toLowerCase().split(',').map((k: string) => k.trim());
    const inputLower = input.toLowerCase();
    const matchedKeywords = rubricKeywords.filter((k: string) => inputLower.includes(k));
    if (matchedKeywords.length > 0) {
      score += matchedKeywords.length * 5;
      reasons.push(`Matched rubric elements: ${matchedKeywords.join(', ')}`);
    }
  }

  score = Math.min(score, 100);
  const pass = score >= 70;

  res.json({
    pass,
    score,
    reasons
  });
});

app.post('/auto-correct', (req: Request, res: Response) => {
  const { input, reasons } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'input required' });
  }

  let corrected = input;
  let improvementScore = 0;

  if (reasons && reasons.includes('Consider expanding content')) {
    corrected += '\n\n[Suggested expansion: Add specific examples or experiences that demonstrate your qualifications.]';
    improvementScore += 10;
  }

  if (!input.trim().endsWith('.')) {
    corrected = corrected.trim() + '.';
    improvementScore += 5;
  }

  res.json({
    corrected,
    score: 70 + improvementScore,
    improvements_applied: improvementScore > 0
  });
});

app.listen(PORT, () => {
  console.log(`[Verifier v2] Running on port ${PORT}`);
});
