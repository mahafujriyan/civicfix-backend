import { Router } from 'express';
import { Role } from '@prisma/client';
import * as complaintController from './complaint.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/role.middleware';
import { validate } from '../../middleware/validation.middleware';
import {
  commentCreateSchema,
  complaintAssignSchema,
  complaintCreateSchema,
  complaintListQuerySchema,
  complaintStatusSchema,
  complaintUpdateSchema,
  feedbackSchema,
} from './complaint.validation';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(Role.CITIZEN, Role.ADMIN),
  validate(complaintCreateSchema),
  complaintController.create,
);

router.get('/', validate(complaintListQuerySchema, 'query'), complaintController.list);

router.get('/:id', complaintController.getById);

router.patch('/:id', validate(complaintUpdateSchema), complaintController.update);

router.delete('/:id', complaintController.remove);

router.patch(
  '/:id/status',
  validate(complaintStatusSchema),
  complaintController.updateStatus,
);

router.post(
  '/:id/assign',
  authorize(Role.ADMIN),
  validate(complaintAssignSchema),
  complaintController.assign,
);

router.get('/:id/history', complaintController.history);

router.post(
  '/:id/comments',
  validate(commentCreateSchema),
  complaintController.addComment,
);

router.get('/:id/comments', complaintController.listComments);

router.post(
  '/:id/feedback',
  authorize(Role.CITIZEN),
  validate(feedbackSchema),
  complaintController.submitFeedback,
);

router.get('/:id/feedback', complaintController.getFeedback);

export default router;
