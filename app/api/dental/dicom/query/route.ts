/**
 * DICOM Query API (C-FIND)
 * Query remote DICOM systems for studies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DicomServerService } from '@/lib/dental/dicom-server';
import { prisma } from '@/lib/db';
import { t } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/dental/dicom/query - Query remote DICOM systems
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: await t('api.unauthorized') }, { status: 401 });
    }

    const body = await request.json();
    const { serverId, patientId, patientName, studyDate, modality } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: await t('api.missingRequiredFields') },
        { status: 400 }
      );
    }

    // Get server configuration
    // In production, this would be stored in database
    // For now, using environment variables
    const serverConfig = {
      id: serverId,
      name: 'Orthanc Server',
      aeTitle: process.env.DICOM_AE_TITLE || 'NEXREL-CRM',
      host: process.env.ORTHANC_HOST || 'localhost',
      port: parseInt(process.env.ORTHANC_PORT || '4242'),
      isActive: true,
      userId: session.user.id,
    };

    // Query remote studies
    const studies = await DicomServerService.queryRemoteStudies(serverConfig, {
      patientId,
      patientName,
      studyDate,
      modality,
    });

    return NextResponse.json({
      success: true,
      studies,
      count: studies.length,
    });
  } catch (error) {
    console.error('Error querying DICOM systems:', error);
    return NextResponse.json(
      { error: await t('api.fetchXraysFailed') },
      { status: 500 }
    );
  }
}
