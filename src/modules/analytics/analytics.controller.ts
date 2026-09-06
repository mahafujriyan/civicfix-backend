import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as analyticsService from './analytics.service';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analyticsService.getOverview();
  sendSuccess({
    res,
    message: 'Analytics overview retrieved successfully',
    data,
  });
});

export const complaints = asyncHandler(async (_req: Request, res: Response) => {
  const data = await analyticsService.getComplaintAnalytics();
  sendSuccess({
    res,
    message: 'Complaint analytics retrieved successfully',
    data,
  });
});
