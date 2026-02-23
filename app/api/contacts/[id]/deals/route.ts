import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, dealService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const contact = await leadService.findUnique(ctx, params.id);
    if (!contact) {
      return apiErrors.notFound('Contact not found');
    }

    const deals = await dealService.findMany(ctx, { leadId: params.id });

    return NextResponse.json(deals);
  } catch (error) {
    console.error('Error fetching contact deals:', error);
    return apiErrors.internal('Failed to fetch deals');
  }
}
