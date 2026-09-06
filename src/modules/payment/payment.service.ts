import Stripe from 'stripe';
import { PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { CreatePaymentSessionInput } from './payment.validation';

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY.includes('xxx')) {
    throw ApiError.badRequest('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(
  userId: string,
  input: CreatePaymentSessionInput,
) {
  if (input.complaintId) {
    const complaint = await prisma.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) {
      throw ApiError.notFound('Complaint not found');
    }
    if (complaint.createdById !== userId) {
      throw ApiError.forbidden('You can only pay for your own complaints');
    }
  }

  const stripe = getStripe();

  const payment = await prisma.payment.create({
    data: {
      userId,
      complaintId: input.complaintId,
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      description: input.description || 'CivicFix service fee',
      status: PaymentStatus.PENDING,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.STRIPE_CANCEL_URL,
    client_reference_id: payment.id,
    metadata: {
      paymentId: payment.id,
      userId,
      complaintId: input.complaintId || '',
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amount,
          product_data: {
            name: input.description || 'CivicFix service fee',
          },
        },
      },
    ],
  });

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id },
  });

  return {
    payment: updated,
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export async function getPaymentById(
  actor: { id: string; role: Role },
  paymentId: string,
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      complaint: { select: { id: true, title: true, status: true } },
    },
  });

  if (!payment) {
    throw ApiError.notFound('Payment not found');
  }

  if (actor.role !== Role.ADMIN && payment.userId !== actor.id) {
    throw ApiError.forbidden('You can only view your own payments');
  }

  return payment;
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET.includes('xxx')) {
    throw ApiError.badRequest('Stripe webhook secret is not configured');
  }
  if (!signature) {
    throw ApiError.unauthorized('Missing Stripe signature');
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid Stripe webhook signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId || session.client_reference_id;
    if (!paymentId) {
      return { received: true };
    }

    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.status === PaymentStatus.PAID) {
        return;
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
          paidAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: payment.userId,
          complaintId: payment.complaintId,
          title: 'Payment successful',
          message: 'Your payment has been confirmed.',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: payment.userId,
          action: 'PAYMENT_PAID',
          entity: 'Payment',
          entityId: payment.id,
          metadata: { sessionId: session.id },
        },
      });
    });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId || session.client_reference_id;
    if (paymentId) {
      await prisma.payment.updateMany({
        where: { id: paymentId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: PaymentStatus.FAILED },
    });
  }

  return { received: true };
}
