/**
 * Debug Auth Configuration
 * 
 * Checks if authentication environment variables are properly configured
 * GET /api/debug-auth-config
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: [],
    errors: [],
  };

  // Check 1: NEXTAUTH_SECRET
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  results.checks.push({
    name: 'NEXTAUTH_SECRET',
    status: nextAuthSecret ? 'present' : 'missing',
    length: nextAuthSecret?.length || 0,
    preview: nextAuthSecret ? `${nextAuthSecret.substring(0, 8)}...` : null,
  });
  if (!nextAuthSecret) {
    results.errors.push('NEXTAUTH_SECRET is missing - authentication will fail');
  }

  // Check 2: NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  results.checks.push({
    name: 'NEXTAUTH_URL',
    status: nextAuthUrl ? 'present' : 'missing',
    value: nextAuthUrl,
  });
  if (!nextAuthUrl) {
    results.errors.push('NEXTAUTH_URL is missing - authentication callbacks will fail');
  } else if (!nextAuthUrl.startsWith('https://')) {
    results.errors.push(`NEXTAUTH_URL should start with https:// but is: ${nextAuthUrl}`);
  }

  // Check 3: DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  results.checks.push({
    name: 'DATABASE_URL',
    status: databaseUrl ? 'present' : 'missing',
    hasValue: !!databaseUrl,
    preview: databaseUrl ? `${databaseUrl.substring(0, 20)}...` : null,
  });
  if (!databaseUrl) {
    results.errors.push('DATABASE_URL is missing - database queries will fail');
  }

  // Check 4: Test database connection
  if (databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      results.checks.push({
        name: 'Database Connection',
        status: 'success',
        message: 'Database is reachable',
      });
    } catch (error: any) {
      results.checks.push({
        name: 'Database Connection',
        status: 'failed',
        error: error.message,
      });
      results.errors.push(`Database connection failed: ${error.message}`);
    }
  } else {
    results.checks.push({
      name: 'Database Connection',
      status: 'skipped',
      reason: 'DATABASE_URL not set',
    });
  }

  // Check 5: Test user lookup (without password)
  if (databaseUrl) {
    try {
      const testEmail = 'realestate@nexrel.com';
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
        },
      });
      
      results.checks.push({
        name: 'User Lookup Test',
        status: user ? 'found' : 'not_found',
        email: testEmail,
        userExists: !!user,
        hasPassword: !!user?.password,
      });
      
      if (!user) {
        results.errors.push(`User ${testEmail} not found in database`);
      } else if (!user.password) {
        results.errors.push(`User ${testEmail} exists but has no password set`);
      }
    } catch (error: any) {
      results.checks.push({
        name: 'User Lookup Test',
        status: 'failed',
        error: error.message,
      });
      results.errors.push(`User lookup failed: ${error.message}`);
    }
  }

  // Summary
  results.summary = {
    allChecksPassed: results.errors.length === 0,
    totalChecks: results.checks.length,
    passedChecks: results.checks.filter((c: any) => c.status === 'success' || c.status === 'present' || c.status === 'found').length,
    failedChecks: results.checks.filter((c: any) => c.status === 'failed' || c.status === 'missing' || c.status === 'not_found').length,
    errors: results.errors.length,
  };

  return NextResponse.json(results, {
    status: results.errors.length > 0 ? 500 : 200,
  });
}
