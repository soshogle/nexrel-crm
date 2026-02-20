/**
 * SMS Templates API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const templates = await prisma.sMSTemplate.findMany({
      where: {
        userId: user.id,
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Error fetching SMS templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, message, variables, category, isDefault } = body;

    if (!name || !message) {
      return NextResponse.json(
        { error: 'name and message are required' },
        { status: 400 }
      );
    }

    const template = await prisma.sMSTemplate.create({
      data: {
        userId: user.id,
        name,
        message,
        variables: variables ?? null,
        category: category ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error creating SMS template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { id, name, message, variables, category, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const existing = await prisma.sMSTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = await prisma.sMSTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(message && { message }),
        ...(variables !== undefined && { variables }),
        ...(category !== undefined && { category }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error updating SMS template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const existing = await prisma.sMSTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.sMSTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting SMS template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
