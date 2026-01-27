import { prisma } from '@/lib/db';

// Temporary stub for Square service - full implementation requires proper Square SDK setup
export async function createPayment(
  userId: string,
  amount: number,
  sourceId: string,
  buyerEmailAddress?: string,
  referenceId?: string
) {
  throw new Error('Square payment service not yet implemented');
}

export async function createSquareCustomer(
  userId: string,
  emailAddress: string,
  givenName?: string,
  familyName?: string
) {
  throw new Error('Square customer service not yet implemented');
}

export async function getPayment(userId: string, paymentId: string) {
  throw new Error('Square payment retrieval not yet implemented');
}

export async function refundPayment(
  userId: string,
  paymentId: string,
  amount?: number
) {
  throw new Error('Square refund service not yet implemented');
}
