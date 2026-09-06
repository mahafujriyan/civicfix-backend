import { Router } from 'express';
import healthRoutes from './health.routes';
import { authRoutes } from '../modules/auth';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);

export default router;
