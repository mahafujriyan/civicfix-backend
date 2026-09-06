import { Role } from '@prisma/client';
import * as complaintService from '../complaint/complaint.service';
import { FeedbackInput } from '../complaint/complaint.validation';

export async function createFeedback(
  actor: { id: string; role: Role },
  complaintId: string,
  input: FeedbackInput,
) {
  return complaintService.submitFeedback(actor, complaintId, input);
}

export async function readFeedback(
  actor: { id: string; role: Role },
  complaintId: string,
) {
  return complaintService.getFeedback(actor, complaintId);
}
