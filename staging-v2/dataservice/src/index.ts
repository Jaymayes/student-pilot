import express, { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.DATASERVICE_API_KEY || 'dev-api-key';
const startTime = Date.now();

app.use(express.json());

const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

const users: Map<string, any> = new Map();
const providers: Map<string, any> = new Map();
const scholarships: Map<string, any> = new Map();
const purchases: Map<string, any> = new Map();

let userIdCounter = 1;
let providerIdCounter = 1;
let scholarshipIdCounter = 1;
let purchaseIdCounter = 1;

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'saa-core-data-v2',
    version: '2.0.0',
    uptime_s: Math.floor((Date.now() - startTime) / 1000),
    status: 'healthy'
  });
});

app.post('/student/signup', apiKeyAuth, (req: Request, res: Response) => {
  const { email, age } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  const student_id = `stu_${userIdCounter++}`;
  const user = {
    id: student_id,
    email,
    age: age || null,
    is_ferpa_covered: false,
    do_not_sell: age && age < 18 ? true : false,
    created_at: new Date().toISOString()
  };
  users.set(student_id, user);
  res.status(201).json({
    student_id: user.id,
    email: user.email,
    is_ferpa_covered: user.is_ferpa_covered,
    do_not_sell: user.do_not_sell,
    created_at: user.created_at
  });
});

app.post('/provider/onboard', apiKeyAuth, (req: Request, res: Response) => {
  const { org, contact } = req.body;
  if (!org || !contact) {
    return res.status(400).json({ error: 'org and contact required' });
  }
  const provider_id = `prov_${providerIdCounter++}`;
  const provider = {
    id: provider_id,
    org,
    contact,
    created_at: new Date().toISOString()
  };
  providers.set(provider_id, provider);
  res.status(201).json({
    provider_id: provider.id,
    org: provider.org,
    contact: provider.contact,
    created_at: provider.created_at
  });
});

app.get('/scholarships/match', apiKeyAuth, (req: Request, res: Response) => {
  const query = (req.query.query as string || '').toLowerCase();
  const results = Array.from(scholarships.values()).filter(s =>
    s.title.toLowerCase().includes(query) ||
    (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(query)))
  );
  res.json(results.map(s => ({
    id: s.id,
    title: s.title,
    amount: s.amount,
    deadline: s.deadline,
    tags: s.tags
  })));
});

app.post('/scholarships', apiKeyAuth, (req: Request, res: Response) => {
  const { title, amount, deadline, tags } = req.body;
  const id = `sch_${scholarshipIdCounter++}`;
  const scholarship = { id, title, amount, deadline, tags: tags || [], created_at: new Date().toISOString() };
  scholarships.set(id, scholarship);
  res.status(201).json(scholarship);
});

app.post('/credits/purchase', apiKeyAuth, (req: Request, res: Response) => {
  const { student_id, credits } = req.body;
  if (!student_id || !credits) {
    return res.status(400).json({ error: 'student_id and credits required' });
  }
  const id = `pur_${purchaseIdCounter++}`;
  const purchase = {
    id,
    student_id,
    credits,
    status: 'created',
    created_at: new Date().toISOString()
  };
  purchases.set(id, purchase);
  res.status(201).json(purchase);
});

app.get('/users/:id', apiKeyAuth, (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.patch('/users/:id/activation', apiKeyAuth, (req: Request, res: Response) => {
  const user = users.get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { activation_status, derived_features } = req.body;
  user.activation_status = activation_status;
  user.derived_features = derived_features;
  user.updated_at = new Date().toISOString();
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`[DataService v2] Running on port ${PORT}`);
});
