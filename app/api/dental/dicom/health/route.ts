/**
 * DICOM Server Health Check
 * Checks if Orthanc server is accessible and healthy
 */

import { NextRequest, NextResponse } from 'next/server';
import { DicomServerService } from '@/lib/dental/dicom-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/dicom/health - Health check for DICOM server
export async function GET(request: NextRequest) {
  try {
    const orthancUrl = process.env.ORTHANC_BASE_URL || 'http://localhost:8042';
    
    // Check if Orthanc is accessible
    const response = await fetch(`${orthancUrl}/system`, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ORTHANC_USERNAME || 'orthanc'}:${process.env.ORTHANC_PASSWORD || 'orthanc'}`
        ).toString('base64')}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          message: 'Orthanc server is not accessible',
          details: {
            url: orthancUrl,
            status: response.status,
            statusText: response.statusText,
          },
        },
        { status: 503 }
      );
    }

    const systemInfo = await response.json();

    return NextResponse.json({
      status: 'healthy',
      message: 'DICOM server is operational',
      details: {
        url: orthancUrl,
        version: systemInfo.Version,
        dicomPort: 4242,
        httpPort: 8042,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Failed to connect to Orthanc server',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          url: process.env.ORTHANC_BASE_URL || 'http://localhost:8042',
        },
      },
      { status: 503 }
    );
  }
}
