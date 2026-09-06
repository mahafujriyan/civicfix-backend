import { Router } from 'express';
import { Role } from '@prisma/client';
import * as categoryController from './category.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  categoryCreateSchema,
  categoryListQuerySchema,
  categoryUpdateSchema,
} from './category.validation';

const router = Router();

router.get('/', validate(categoryListQuerySchema, 'query'), categoryController.list);
router.get('/:id', categoryController.getById);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validate(categoryCreateSchema),
  categoryController.create,
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validate(categoryUpdateSchema),
  categoryController.update,
);

router.delete('/:id', authenticate, authorize(Role.ADMIN), categoryController.remove);

export default router;
