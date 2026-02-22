import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid contact IDs' },
        { status: 400 }
      );
    }

    // Verify all contacts belong to the user
    const contacts = await leadService.findMany(ctx, {
      where: { id: { in: contactIds } },
      select: { id: true },
    });

    if (contacts.length !== contactIds.length) {
      return NextResponse.json(
        { error: 'Some contacts not found or unauthorized' },
        { status: 403 }
      );
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
    return NextResponse.json(
      { error: 'Failed to delete contacts' },
      { status: 500 }
    );
  }
}
