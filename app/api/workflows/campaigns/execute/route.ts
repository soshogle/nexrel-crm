/**
 * Execute Campaign API
 * Executes a workflow in campaign mode (batch execution)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowTemplateService, leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return apiErrors.badRequest('Workflow ID is required');
    }

    // Fetch workflow template
    const workflow = await workflowTemplateService.findUnique(ctx, workflowId);

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    if ((workflow as any).executionMode !== 'CAMPAIGN') {
      return apiErrors.badRequest('Workflow is not in campaign mode');
    }

    const audience = (workflow as any).audience as any;
    const campaignSettings = (workflow as any).campaignSettings as any;

    if (!audience || (audience.type !== 'FILTERED' && audience.type !== 'WEBSITE_LEADS')) {
      return apiErrors.badRequest('Invalid audience configuration');
    }

    // Build lead query based on audience filters (leadService adds userId)
    const leadWhere: any = {};

    if (audience.filters?.minLeadScore) {
      leadWhere.leadScore = { gte: audience.filters.minLeadScore };
    }
    if (audience.filters?.statuses?.length > 0) {
      leadWhere.status = { in: audience.filters.statuses };
    }
    if (audience.filters?.tags?.length > 0) {
      leadWhere.tags = { hasSome: audience.filters.tags };
    }
    if (audience.filters?.hasPhone) {
      leadWhere.phone = { not: null };
    }
    if (audience.filters?.hasEmail) {
      leadWhere.email = { not: null };
    }
    // Website leads: filter by source (website, Website Form, etc.)
    if (audience.filters?.sources?.length > 0) {
      leadWhere.source = { in: audience.filters.sources };
    } else if (audience.type === 'WEBSITE_LEADS') {
      leadWhere.source = { in: ['website', 'Website Form', 'website_form', 'Website'] };
    }

    // Get matching leads
    const leads = await leadService.findMany(ctx, {
      where: leadWhere,
      select: {
        id: true,
        email: true,
        phone: true,
        businessName: true,
      } as any,
    });

    const totalRecipients = leads.length;

    if (totalRecipients === 0) {
      return apiErrors.badRequest('No leads match the audience criteria');
    }

    // Update workflow template with recipient count
    await (getCrmDb(ctx) as any).workflowTemplate.update({
      where: { id: workflowId, userId: ctx.userId },
      data: {
        totalRecipients: totalRecipients as any,
        isActive: true,
      },
    });

    // Create workflow instances for each lead
    const instances = await Promise.all(
      leads.map((lead) =>
        (getCrmDb(ctx) as any).workflowInstance.create({
          data: {
            templateId: workflow.id,
            userId: ctx.userId,
            leadId: lead.id,
            status: 'ACTIVE',
          },
        })
      )
    );

    // Schedule workflow execution for each enrollment
    // This will be handled by the workflow execution engine
    // For now, we'll return success and let the background job process it

    return NextResponse.json({
      success: true,
      message: `Campaign started for ${totalRecipients} recipients`,
      totalRecipients,
      instancesCreated: instances.length,
    });
  } catch (error: any) {
    console.error('Error executing campaign:', error);
    return apiErrors.internal(error.message || 'Failed to execute campaign');
  }
}
