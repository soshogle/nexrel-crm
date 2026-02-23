import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { tags } = body;

    if (!Array.isArray(tags)) {
      return apiErrors.badRequest('Invalid tags format');
    }

    const contact = await leadService.findUnique(ctx, params.id);
    if (!contact) {
      return apiErrors.notFound('Contact not found');
    }

    const updatedContact = await leadService.update(ctx, params.id, {
      tags: JSON.parse(JSON.stringify(tags)),
    });

    return NextResponse.json({
      success: true,
      tags: Array.isArray(updatedContact.tags) ? updatedContact.tags : [],
    });
  } catch (error) {
    console.error('Error updating contact tags:', error);
    return apiErrors.internal('Failed to update tags');
  }
}
