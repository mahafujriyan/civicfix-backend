import { Router } from 'express';
import healthRoutes from './health.routes';
import { authRoutes } from '../modules/auth';
import { userRoutes } from '../modules/user';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
