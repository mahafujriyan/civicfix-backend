import { Router } from 'express';
import { Role } from '@prisma/client';
import * as departmentController from './department.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  departmentCreateSchema,
  departmentListQuerySchema,
  departmentUpdateSchema,
} from './department.validation';

const router = Router();

router.get('/', validate(departmentListQuerySchema, 'query'), departmentController.list);
router.get('/active/list', asyncHandler(async (_req, res) => {
  const data = await departmentService.getActiveDepartmentsCached();
  sendSuccess({ res, message: 'Active departments retrieved successfully', data });
}));
router.get('/:id', departmentController.getById);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  validate(departmentCreateSchema),
  departmentController.create,
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  validate(departmentUpdateSchema),
  departmentController.update,
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  departmentController.remove,
);

export default router;
