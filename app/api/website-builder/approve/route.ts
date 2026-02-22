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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, approvalId, action } = body; // action: 'approve' | 'reject'

    if (!websiteId || !approvalId || !action) {
      return NextResponse.json(
        { error: 'Website ID, approval ID, and action are required' },
        { status: 400 }
      );
    }

    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const db = getCrmDb(ctx);
    const approval = await db.websiteChangeApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval || approval.websiteId !== websiteId) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
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
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
