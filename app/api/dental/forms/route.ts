/**
 * Dental Forms API
 * Handles dynamic form templates and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get forms (templates) or form responses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'templates' or 'responses'
    const leadId = searchParams.get('leadId');
    const formId = searchParams.get('formId');

    if (type === 'responses') {
      // Get form responses
      const where: any = { userId: session.user.id };
      if (leadId) where.leadId = leadId;
      if (formId) where.formId = formId;

      const responses = await db.dentalFormResponse.findMany({
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
      const forms = await db.dentalForm.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ success: true, forms });
    }
  } catch (error: any) {
    console.error('Error fetching forms:', error);
    return apiErrors.internal(await t('api.fetchFormsFailed'));
  }
}

// POST - Create form template or submit form response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    const body = await request.json();
    const { type, formId, leadId, formData, formName, formSchema, isTemplate, clinicId, category, description } = body;

    // Get clinicId from request or user's primary clinic
    let finalClinicId = clinicId;
    if (!finalClinicId) {
      const primaryClinic = await db.userClinic.findFirst({
        where: {
          userId: session.user.id,
          isPrimary: true,
        },
        select: {
          clinicId: true,
        },
      });
      if (primaryClinic) {
        finalClinicId = primaryClinic.clinicId;
      } else {
        // If no primary clinic, get first clinic
        const firstClinic = await db.userClinic.findFirst({
          where: {
            userId: session.user.id,
          },
          select: {
            clinicId: true,
          },
        });
        if (firstClinic) {
          finalClinicId = firstClinic.clinicId;
        }
      }
    }

    // If still no clinicId, return error
    if (!finalClinicId) {
      return apiErrors.badRequest('Clinic ID is required. Please create or select a clinic first.');
    }

    if (isTemplate || type === 'template') {
      // Create form template
      if (!formName || !formSchema) {
        return apiErrors.badRequest(await t('api.formNameSchemaRequired'));
      }

      const form = await db.dentalForm.create({
        data: {
          userId: session.user.id,
          clinicId: finalClinicId,
          formName,
          formSchema,
          category: category || null,
          description: description || null,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, form });
    } else {
      // Submit form response
      if (!formId || !leadId || !formData) {
        return apiErrors.badRequest(await t('api.formIdLeadIdDataRequired'));
      }

      // Get clinicId from the form if not provided
      let responseClinicId = clinicId;
      if (!responseClinicId) {
        const form = await db.dentalForm.findUnique({
          where: { id: formId },
          select: { clinicId: true },
        });
        if (form) {
          responseClinicId = form.clinicId;
        } else {
          // Fallback to user's primary clinic
          responseClinicId = finalClinicId;
        }
      }

      const response = await db.dentalFormResponse.create({
        data: {
          formId,
          leadId,
          userId: session.user.id,
          clinicId: responseClinicId,
          responseData: formData,
          submittedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, response });
    }
  } catch (error: any) {
    console.error('Error saving form:', error);
    return apiErrors.internal(await t('api.saveFormFailed'), error.message);
  }
}
