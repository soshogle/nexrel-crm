
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tags } = body;

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'Invalid tags format' },
        { status: 400 }
      );
    }

    const contact = await prisma.lead.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const updatedContact = await prisma.lead.update({
      where: { id: params.id },
      data: {
        tags: JSON.parse(JSON.stringify(tags)),
      },
    });

    return NextResponse.json({
      success: true,
      tags: Array.isArray(updatedContact.tags) ? updatedContact.tags : [],
    });
  } catch (error) {
    console.error('Error updating contact tags:', error);
    return NextResponse.json(
      { error: 'Failed to update tags' },
      { status: 500 }
    );
  }
}
