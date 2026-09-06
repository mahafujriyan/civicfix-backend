import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as assignmentService from './assignment.service';

const router = Router();

router.get(
  '/staff',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await assignmentService.listAssignableStaff();
    sendSuccess({
      res,
      message: 'Assignable staff retrieved successfully',
      data,
    });
  }),
);

export default router;
