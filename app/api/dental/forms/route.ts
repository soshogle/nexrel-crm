/**
 * Dental Forms API
 * Handles dynamic form templates and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get forms (templates) or form responses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'templates' or 'responses'
    const leadId = searchParams.get('leadId');
    const formId = searchParams.get('formId');

    if (type === 'responses') {
      // Get form responses
      const where: any = { userId: session.user.id };
      if (leadId) where.leadId = leadId;
      if (formId) where.formId = formId;

      const responses = await prisma.dentalFormResponse.findMany({
        where,
        include: {
          form: {
            select: {
              formName: true,
              formSchema: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

      return NextResponse.json({ success: true, responses });
    } else {
      // Get form templates
      const forms = await prisma.dentalForm.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, forms });
    }
  } catch (error: any) {
    console.error('Error fetching forms:', error);
    return NextResponse.json({ error: await t('api.fetchFormsFailed') }, { status: 500 });
  }
}

// POST - Create form template or submit form response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const body = await request.json();
    const { type, formId, leadId, formData, formName, formSchema, isTemplate } = body;

    if (isTemplate || type === 'template') {
      // Create form template
      if (!formName || !formSchema) {
        return NextResponse.json(
          { error: await t('api.formNameSchemaRequired') },
          { status: 400 }
        );
      }

      const form = await prisma.dentalForm.create({
        data: {
          userId: session.user.id,
          formName,
          formSchema,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, form });
    } else {
      // Submit form response
      if (!formId || !leadId || !formData) {
        return NextResponse.json(
          { error: await t('api.formIdLeadIdDataRequired') },
          { status: 400 }
        );
      }

      const response = await prisma.dentalFormResponse.create({
        data: {
          formId,
          leadId,
          userId: session.user.id,
          responseData: formData,
          submittedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, response });
    }
  } catch (error: any) {
    console.error('Error saving form:', error);
    return NextResponse.json(
      { error: await t('api.saveFormFailed'), details: error.message },
      { status: 500 }
    );
  }
}
