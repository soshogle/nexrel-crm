/**
 * Approve Website Changes API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, websiteService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { changeApproval } from '@/lib/website-builder/approval';
import { triggerWebsiteDeploy } from '@/lib/website-builder/deploy-trigger';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { websiteId, approvalId, action } = body; // action: 'approve' | 'reject'

    if (!websiteId || !approvalId || !action) {
      return apiErrors.badRequest('Website ID, approval ID, and action are required');
    }

    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const db = getCrmDb(ctx);
    const approval = await db.websiteChangeApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval || approval.websiteId !== websiteId) {
      return apiErrors.notFound('Approval not found');
    }

    if (action === 'approve') {
      // Apply approved changes
      const newStructure = changeApproval.applyApprovedChanges(
        website.structure as any,
        approval.changes as any
      );

      // Update website
      await websiteService.update(ctx, websiteId, { structure: newStructure });

      // Update approval status
      await db.websiteChangeApproval.update({
        where: { id: approvalId },
        data: {
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });

      triggerWebsiteDeploy(websiteId).catch((e) => console.warn('[Approve] Deploy:', e));

      return NextResponse.json({ success: true, structure: newStructure });
    } else if (action === 'reject') {
      // Update approval status
      await db.websiteChangeApproval.update({
        where: { id: approvalId },
        data: {
          status: 'REJECTED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    } else {
      return apiErrors.badRequest('Invalid action. Use "approve" or "reject"');
    }
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return apiErrors.internal('Failed to process approval');
  }
}
