/**
 * Email Templates API
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

    const templates = await prisma.emailTemplate.findMany({
      where: {
        userId: user.id,
        ...(category && { category }),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
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
    const { name, subject, body: bodyText, bodyHtml, variables, category, isDefault } = body;

    if (!name || !subject || !bodyText) {
      return NextResponse.json(
        { error: 'name, subject, and body are required' },
        { status: 400 }
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        userId: user.id,
        name,
        subject,
        body: bodyText,
        bodyHtml: bodyHtml ?? null,
        variables: variables ?? null,
        category: category ?? null,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error creating email template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}
