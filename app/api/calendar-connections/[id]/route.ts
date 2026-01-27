
/**
 * Individual Calendar Connection API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        calendarId: true,
        calendarName: true,
        syncEnabled: true,
        lastSyncAt: true,
        syncStatus: true,
        webhookUrl: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection });
  } catch (error) {
    console.error('Error fetching calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar connection' },
      { status: 500 }
    );
  }
}

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
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      calendarName,
      syncEnabled,
      webhookUrl,
      apiKey,
      settings,
      calendarId,
    } = body;

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const updated = await prisma.calendarConnection.update({
      where: { id: params.id },
      data: {
        calendarName,
        syncEnabled,
        webhookUrl,
        apiKey,
        settings: settings || connection.settings,
        calendarId,
      },
    });

    return NextResponse.json({ connection: updated });
  } catch (error) {
    console.error('Error updating calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar connection' },
      { status: 500 }
    );
  }
}

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
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await prisma.calendarConnection.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar connection' },
      { status: 500 }
    );
  }
}
