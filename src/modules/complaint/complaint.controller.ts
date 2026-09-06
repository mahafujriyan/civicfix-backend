import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as complaintService from './complaint.service';
import {
  CommentCreateInput,
  ComplaintAssignInput,
  ComplaintCreateInput,
  ComplaintListQuery,
  ComplaintStatusInput,
  ComplaintUpdateInput,
  FeedbackInput,
} from './complaint.validation';

function actor(req: Request) {
  return { id: req.user!.id, role: req.user!.role };
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.createComplaint(
    req.user!.id,
    req.body as ComplaintCreateInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Complaint created successfully',
    data: complaint,
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.listComplaints(
    actor(req),
    req.query as unknown as ComplaintListQuery,
  );
  sendSuccess({
    res,
    message: 'Complaints retrieved successfully',
    data,
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.getComplaintById(actor(req), req.params.id as string);
  sendSuccess({
    res,
    message: 'Complaint retrieved successfully',
    data: complaint,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.updateComplaint(
    actor(req),
    req.params.id as string,
    req.body as ComplaintUpdateInput,
  );
  sendSuccess({
    res,
    message: 'Complaint updated successfully',
    data: complaint,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await complaintService.deleteComplaint(actor(req), req.params.id as string);
  sendSuccess({
    res,
    message: 'Complaint deleted successfully',
    data: null,
  });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.updateComplaintStatus(
    actor(req),
    req.params.id as string,
    req.body as ComplaintStatusInput,
  );
  sendSuccess({
    res,
    message: 'Complaint status updated successfully',
    data: complaint,
  });
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const complaint = await complaintService.assignComplaint(
    actor(req),
    req.params.id as string,
    req.body as ComplaintAssignInput,
  );
  sendSuccess({
    res,
    message: 'Complaint assigned successfully',
    data: complaint,
  });
});

export const history = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.getComplaintHistory(actor(req), req.params.id as string);
  sendSuccess({
    res,
    message: 'Complaint history retrieved successfully',
    data,
  });
});

export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await complaintService.addComment(
    actor(req),
    req.params.id as string,
    req.body as CommentCreateInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Comment added successfully',
    data: comment,
  });
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const data = await complaintService.listComments(actor(req), req.params.id as string);
  sendSuccess({
    res,
    message: 'Comments retrieved successfully',
    data,
  });
});

export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  const feedback = await complaintService.submitFeedback(
    actor(req),
    req.params.id as string,
    req.body as FeedbackInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Feedback submitted successfully',
    data: feedback,
  });
});

export const getFeedback = asyncHandler(async (req: Request, res: Response) => {
  const feedback = await complaintService.getFeedback(actor(req), req.params.id as string);
  sendSuccess({
    res,
    message: 'Feedback retrieved successfully',
    data: feedback,
  });
});
