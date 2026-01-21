import { Router, Request, Response } from 'express';
import { db, checkDatabaseHealth } from '../../db';
import { dataRoutes } from './routes';
import { requestIdMiddleware } from './middleware/audit';

export const dataServiceRouter = Router();

dataServiceRouter.use(requestIdMiddleware);

dataServiceRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'dataservice',
    version: 'v2',
    timestamp: new Date().toISOString() 
  });
});

dataServiceRouter.get('/readyz', async (_req: Request, res: Response) => {
  try {
    const healthy = await checkDatabaseHealth();
    if (healthy) {
      res.json({ 
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({ 
        status: 'not_ready',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not_ready',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

dataServiceRouter.use('/', dataRoutes);

export default dataServiceRouter;
