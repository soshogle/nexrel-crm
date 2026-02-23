
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createQuickBooksInvoice } from '@/lib/integrations/quickbooks-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const {
      customerId,
      customerName,
      customerEmail,
      lineItems,
      dueDate,
      memo
    } = body;

    if (!customerName || !customerEmail || !lineItems || lineItems.length === 0) {
      return apiErrors.badRequest('Missing required fields');
    }

    const result = await createQuickBooksInvoice(session.user.id, {
      customerId,
      customerName,
      customerEmail,
      lineItems,
      dueDate,
      memo
    });

    if (!result.success) {
      return apiErrors.badRequest(result.error!);
    }

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      invoiceNumber: result.invoiceNumber
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return apiErrors.internal('Failed to create invoice');
  }
}
