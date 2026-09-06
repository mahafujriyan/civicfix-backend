import { Router } from 'express';
import { Role } from '@prisma/client';
import * as analyticsController from './analytics.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get('/overview', analyticsController.overview);
router.get('/complaints', analyticsController.complaints);

export default router;
