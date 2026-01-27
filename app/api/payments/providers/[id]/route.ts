
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// DELETE - Delete a payment provider

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const provider = await prisma.paymentProviderSettings.findUnique({
      where: { id: params.id }
    });

    if (!provider || provider.userId !== user.id) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    await prisma.paymentProviderSettings.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment provider:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment provider' },
      { status: 500 }
    );
  }
}

// PATCH - Toggle provider active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { isActive, isDefault } = body;

    // Verify ownership
    const provider = await prisma.paymentProviderSettings.findUnique({
      where: { id: params.id }
    });

    if (!provider || provider.userId !== user.id) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentProviderSettings.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const updated = await prisma.paymentProviderSettings.update({
      where: { id: params.id },
      data: {
        isActive: isActive !== undefined ? isActive : provider.isActive,
        isDefault: isDefault !== undefined ? isDefault : provider.isDefault
      }
    });

    return NextResponse.json({
      success: true,
      provider: {
        id: updated.id,
        provider: updated.provider,
        isActive: updated.isActive,
        isDefault: updated.isDefault
      }
    });
  } catch (error) {
    console.error('Error updating payment provider:', error);
    return NextResponse.json(
      { error: 'Failed to update payment provider' },
      { status: 500 }
    );
  }
}
