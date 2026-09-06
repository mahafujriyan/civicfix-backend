import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { rateLimit } from '../../middleware/rate-limit.middleware';
import { googleAuthSchema, loginSchema, registerSchema } from './auth.validation';

const router = Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'rl:auth',
});

router.post('/register', authRateLimit, validate(registerSchema), authController.register);
router.post('/login', authRateLimit, validate(loginSchema), authController.login);
router.post('/google', authRateLimit, validate(googleAuthSchema), authController.googleLogin);
router.get('/me', authenticate, authController.me);

export default router;
