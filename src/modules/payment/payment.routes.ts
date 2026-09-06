import { Router } from 'express';
import express from 'express';
import { Role } from '@prisma/client';
import * as paymentController from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import { rateLimit } from '../../middleware/rate-limit.middleware';
import { createPaymentSessionSchema } from './payment.validation';

const router = Router();

const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyPrefix: 'rl:payment',
});

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhook,
);

router.post(
  '/create-session',
  authenticate,
  authorize(Role.CITIZEN, Role.ADMIN),
  paymentRateLimit,
  validate(createPaymentSessionSchema),
  paymentController.createSession,
);

router.get('/:id', authenticate, paymentController.getById);

export default router;
