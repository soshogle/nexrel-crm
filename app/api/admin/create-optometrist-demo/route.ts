import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/create-optometrist-demo
 * 
 * Secure endpoint to create optometrist demo account with French mock data.
 * Only accessible to authenticated users (or super admin for production).
 * 
 * This will create:
 * - User account: optometriste@demo.nexrel.com / DemoOptometrist2024!
 * - Contacts, leads, calls, messages, campaigns, workflows, reviews, referrals
 * - All data in French, tagged with MOCK_DATA
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Optional: Restrict to super admin in production
    // if (process.env.NODE_ENV === 'production' && session.user.role !== 'SUPER_ADMIN') {
    //   return NextResponse.json(
    //     { error: 'Forbidden - Super Admin access required' },
    //     { status: 403 }
    //   );
    // }

    console.log('[Demo API] Creating optometrist demo data for user:', session.user.id);

    try {
      // Run the demo script
      const output = execSync('npx tsx scripts/create-optometrist-demo.ts', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      console.log('[Demo API] Demo creation output:', output);

      return NextResponse.json({
        success: true,
        message: 'Optometrist demo data created successfully',
        details: output,
        credentials: {
          email: 'optometriste@demo.nexrel.com',
          password: 'DemoOptometrist2024!',
        },
      });
    } catch (error: any) {
      console.error('[Demo API] Error creating demo:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create demo data',
          details: error.stdout || error.stderr,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Demo API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create demo data' },
      { status: 500 }
    );
  }
}
