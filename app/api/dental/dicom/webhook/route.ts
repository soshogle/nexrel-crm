/**
 * DICOM Server Webhook Handler
 * Receives notifications from Orthanc when new DICOM files arrive
 */

import { NextRequest, NextResponse } from 'next/server';
import { DicomServerService } from '@/lib/dental/dicom-server';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/dicom/webhook - Handle Orthanc webhook
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (in production, add authentication)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.DICOM_WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { event, resourceId, userId } = body;

    // Handle different event types
    if (event === 'NewInstance' && resourceId) {
      // New DICOM instance received
      if (!userId) {
        return apiErrors.badRequest(await t('api.missingRequiredFields'));
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
    return apiErrors.internal(await t('api.uploadXrayFailed'));
  }
}
