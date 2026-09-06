import { Router } from 'express';
import healthRoutes from './health.routes';
import { authRoutes } from '../modules/auth';
import { userRoutes } from '../modules/user';
import { departmentRoutes } from '../modules/department';
import { categoryRoutes } from '../modules/category';
import { complaintRoutes } from '../modules/complaint';
import { paymentRoutes } from '../modules/payment';
import { analyticsRoutes } from '../modules/analytics';
import { notificationRoutes } from '../modules/notification';
import { assignmentRoutes } from '../modules/assignment';

const router = Router();

router.use(healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/departments', departmentRoutes);
router.use('/categories', categoryRoutes);
router.use('/complaints', complaintRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/assignments', assignmentRoutes);

export default router;
