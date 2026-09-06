import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler';
import { sendSuccess } from '../../utils/response';
import * as paymentService from './payment.service';
import { CreatePaymentSessionInput } from './payment.validation';

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await paymentService.createCheckoutSession(
    req.user!.id,
    req.body as CreatePaymentSessionInput,
  );
  sendSuccess({
    res,
    statusCode: 201,
    message: 'Checkout session created successfully',
    data,
  });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentById(
    { id: req.user!.id, role: req.user!.role },
    req.params.id as string,
  );
  sendSuccess({
    res,
    message: 'Payment retrieved successfully',
    data: payment,
  });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  const rawBody = req.body as Buffer;
  const result = await paymentService.handleStripeWebhook(
    rawBody,
    typeof signature === 'string' ? signature : undefined,
  );
  sendSuccess({
    res,
    message: 'Webhook processed',
    data: result,
  });
});
