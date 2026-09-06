import { Router } from 'express';
import { Role } from '@prisma/client';
import * as userController from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  updateProfileSchema,
  updateUserStatusSchema,
  userListQuerySchema,
} from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);

router.get(
  '/',
  authorize(Role.ADMIN),
  validate(userListQuerySchema, 'query'),
  userController.listUsers,
);

router.get('/:id', authorize(Role.ADMIN), userController.getUser);

router.patch(
  '/:id/status',
  authorize(Role.ADMIN),
  validate(updateUserStatusSchema),
  userController.updateUserStatus,
);

export default router;
