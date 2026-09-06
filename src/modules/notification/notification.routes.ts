import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as notificationService from './notification.service';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.listUserNotifications(req.user!.id);
    sendSuccess({
      res,
      message: 'Notifications retrieved successfully',
      data,
    });
  }),
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markNotificationRead(req.user!.id, req.params.id as string);
    sendSuccess({
      res,
      message: 'Notification marked as read',
      data: null,
    });
  }),
);

export default router;
