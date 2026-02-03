import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || 'realestate@nexrel.com'
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
  });
  if (!databaseUrl) {
    results.errors.push('DATABASE_URL is missing - database queries will fail');
  }

  // Check 4: Test database connection
  let dbConnected = false;
  if (databaseUrl) {
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      dbConnected = true;
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

  // Check 5: Test user lookup
  if (dbConnected) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { 
          id: true, 
          email: true, 
          name: true,
          password: true,
          accountStatus: true,
          role: true
        }
      })
      
      results.checks.push({
        name: 'User Lookup',
        status: user ? 'found' : 'not_found',
        email: email,
        userExists: !!user,
        hasPassword: !!user?.password,
      });
      
      if (!user) {
        results.errors.push(`User ${email} not found in database`);
      } else if (!user.password) {
        results.errors.push(`User ${email} exists but has no password set`);
      } else {
        // Test password (optional - don't fail if wrong)
        const testPassword = request.nextUrl.searchParams.get('testPassword');
        if (testPassword) {
          const passwordMatch = await bcrypt.compare(testPassword, user.password);
          results.checks.push({
            name: 'Password Test',
            status: passwordMatch ? 'match' : 'no_match',
          });
        }
      }
    } catch (error: any) {
      results.checks.push({
        name: 'User Lookup',
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
