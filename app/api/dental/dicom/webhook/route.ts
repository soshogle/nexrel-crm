/**
 * DICOM Server Webhook Handler
 * Receives notifications from Orthanc when new DICOM files arrive
 */

import { NextRequest, NextResponse } from 'next/server';
import { DicomServerService } from '@/lib/dental/dicom-server';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/dicom/webhook - Handle Orthanc webhook
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (in production, add authentication)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.DICOM_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event, resourceId, userId } = body;

    // Handle different event types
    if (event === 'NewInstance' && resourceId) {
      // New DICOM instance received
      if (!userId) {
        return NextResponse.json(
          { error: await t('api.missingRequiredFields') },
          { status: 400 }
        );
      }

      // Process the new instance
      await DicomServerService.handleCStoreWebhook(resourceId, userId);

      return NextResponse.json({
        success: true,
        message: 'DICOM instance processed',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    console.error('Error handling DICOM webhook:', error);
    return NextResponse.json(
      { error: await t('api.uploadXrayFailed') },
      { status: 500 }
    );
  }
}
