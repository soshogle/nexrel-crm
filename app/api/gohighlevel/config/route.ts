import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { goHighLevelService } from '@/lib/gohighlevel-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gohighlevel/config
 * Get GoHighLevel configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if GoHighLevel is configured in environment
    const isConfigured = goHighLevelService.isConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message: 'GoHighLevel API credentials not configured in environment variables',
        required: [
          'GOHIGHLEVEL_API_KEY',
          'GOHIGHLEVEL_LOCATION_ID',
        ],
      });
    }

    // Test the connection
    const testResult = await goHighLevelService.testConnection();

    if (!testResult.success) {
      return NextResponse.json({
        configured: true,
        connected: false,
        error: testResult.error,
      });
    }

    // Get available channels
    const channels = await goHighLevelService.getAvailableChannels();

    return NextResponse.json({
      configured: true,
      connected: true,
      channels,
    });
  } catch (error: any) {
    console.error('Error checking GoHighLevel config:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gohighlevel/config/test
 * Test GoHighLevel connection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const testResult = await goHighLevelService.testConnection();

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: testResult.error,
      }, { status: 400 });
    }

    // Get available channels
    const channels = await goHighLevelService.getAvailableChannels();

    return NextResponse.json({
      success: true,
      channels,
    });
  } catch (error: any) {
    console.error('Error testing GoHighLevel connection:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Connection test failed' },
      { status: 500 }
    );
  }
}
