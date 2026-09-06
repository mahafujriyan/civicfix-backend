import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // Stripe webhook needs raw body — mounted later in payment routes.
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/v1/payments/webhook') {
      next();
      return;
    }
    express.json({ limit: '1mb' })(req, res, next);
  });

  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'CivicFix API',
      data: {
        docs: '/api/docs',
        health: '/api/v1/health',
        version: 'v1',
      },
    });
  });

  app.use('/api/v1', routes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
