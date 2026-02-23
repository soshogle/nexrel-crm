/**
 * SMS Templates API
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

    const templates = await prisma.sMSTemplate.findMany({
      where,
      take: pagination.take,
      skip: pagination.skip,
      orderBy: { name: 'asc' },
    });

    const total = await prisma.sMSTemplate.count({ where });
    return paginatedResponse(templates, total, pagination, 'templates');
  } catch (error: any) {
    console.error('Error fetching SMS templates:', error);
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
    const { name, message, variables, category, isDefault } = body;

    if (!name || !message) {
      return apiErrors.badRequest('name and message are required');
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
    const { id, name, message, variables, category, isDefault } = body;

    if (!id) {
      return apiErrors.badRequest('Template ID required');
    }

    const existing = await prisma.sMSTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return apiErrors.notFound('Template not found');
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

    const existing = await prisma.sMSTemplate.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return apiErrors.notFound('Template not found');
    }

    await prisma.sMSTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting SMS template:', error);
    return apiErrors.internal(error.message || 'Failed to delete template');
  }
}
