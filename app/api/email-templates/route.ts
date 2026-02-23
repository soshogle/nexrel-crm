/**
 * Email Templates API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const pagination = parsePagination(req);

    const where: any = { userId: user.id, ...(category && { category }) };

    const templates = await prisma.emailTemplate.findMany({
      where,
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { name: 'asc' },
    });

    const total = await prisma.emailTemplate.count({ where });
    return paginatedResponse(templates, total, pagination);
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return apiErrors.internal(error.message || 'Failed to fetch templates');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const body = await req.json();
    const { name, subject, body: bodyText, bodyHtml, variables, category, isDefault } = body;

    if (!name || !subject || !bodyText) {
      return apiErrors.badRequest('name, subject, and body are required');
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
    return apiErrors.internal(error.message || 'Failed to create template');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const body = await req.json();
    const { id, name, subject, body: bodyText, bodyHtml, variables, category, isDefault } = body;

    if (!id) {
      return apiErrors.badRequest('Template ID required');
    }

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return apiErrors.notFound('Template not found');
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(bodyText && { body: bodyText }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(variables !== undefined && { variables }),
        ...(category !== undefined && { category }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error updating email template:', error);
    return apiErrors.internal(error.message || 'Failed to update template');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return apiErrors.notFound('User not found');
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return apiErrors.badRequest('Template ID required');
    }

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return apiErrors.notFound('Template not found');
    }

    await prisma.emailTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting email template:', error);
    return apiErrors.internal(error.message || 'Failed to delete template');
  }
}
