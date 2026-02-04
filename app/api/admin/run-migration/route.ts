import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/run-migration
 * 
 * Secure endpoint to run database migrations.
 * Only accessible to authenticated users.
 * 
 * This will:
 * - Add dateOfBirth column to Lead table
 * - Create FeedbackCollection table if missing
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

    console.log('[Migration API] Running migration for user:', session.user.id);

    // Run prisma db push to sync schema
    // This is safe because we're only adding columns/tables, not removing
    try {
      const output = execSync('npx prisma db push --skip-generate', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      console.log('[Migration API] Migration output:', output);

      // Regenerate Prisma client
      execSync('npx prisma generate', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        details: output,
      });
    } catch (error: any) {
      console.error('[Migration API] Migration error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Migration failed',
          details: error.stdout || error.stderr,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Migration API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run migration' },
      { status: 500 }
    );
  }
}
