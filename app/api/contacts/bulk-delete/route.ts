import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return apiErrors.badRequest('Invalid contact IDs');
    }

    // Verify all contacts belong to the user
    const contacts = await leadService.findMany(ctx, {
      where: { id: { in: contactIds } },
      select: { id: true },
    });

    if (contacts.length !== contactIds.length) {
      return apiErrors.forbidden('Some contacts not found or unauthorized');
    }

    await getCrmDb(ctx).lead.deleteMany({
      where: {
        id: { in: contactIds },
        userId: ctx.userId,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: contacts.length,
    });
  } catch (error) {
    console.error('Error bulk deleting contacts:', error);
    return apiErrors.internal('Failed to delete contacts');
  }
}
