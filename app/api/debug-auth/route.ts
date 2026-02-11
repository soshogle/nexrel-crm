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
    preview: databaseUrl ? `${databaseUrl.substring(0, 30)}...${databaseUrl.substring(databaseUrl.length - 20)}` : null,
    containsHost: databaseUrl?.includes('host:5432') || false,
    containsNeon: databaseUrl?.includes('neon.tech') || false,
  });
  if (!databaseUrl) {
    results.errors.push('DATABASE_URL is missing - database queries will fail');
  } else if (databaseUrl.includes('host:5432')) {
    results.errors.push('DATABASE_URL contains placeholder "host:5432" - this is incorrect!');
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
      // Include DATABASE_URL info in the error for debugging
      const errorDetails = {
        message: error.message,
        code: error.code,
        meta: error.meta,
        databaseUrlPreview: databaseUrl ? `${databaseUrl.substring(0, 30)}...${databaseUrl.substring(databaseUrl.length - 20)}` : 'NOT SET',
        databaseUrlContainsHost: databaseUrl?.includes('host:5432') || false,
        databaseUrlContainsNeon: databaseUrl?.includes('neon.tech') || false,
      };
      
      results.checks.push({
        name: 'Database Connection',
        status: 'failed',
        error: error.message,
        errorDetails: errorDetails,
      });
      results.errors.push(`Database connection failed: ${error.message}`);
      results.errors.push(`DATABASE_URL being used: ${databaseUrl ? 'SET' : 'NOT SET'}`);
      if (databaseUrl) {
        results.errors.push(`DATABASE_URL preview: ${databaseUrl.substring(0, 50)}...`);
        results.errors.push(`Contains 'host:5432': ${databaseUrl.includes('host:5432')}`);
        results.errors.push(`Contains 'neon.tech': ${databaseUrl.includes('neon.tech')}`);
      }
    }
  } else {
    results.checks.push({
      name: 'Database Connection',
      status: 'skipped',
      reason: 'DATABASE_URL not set',
    });
  }

  // Check 5: Google OAuth config (for Sign in with Google)
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleRedirectUri = nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/google` : null;
  const isPlaceholder = !googleClientId || !googleClientSecret || 
    googleClientId === 'placeholder' || googleClientSecret === 'placeholder';
  const hasValidFormat = googleClientId?.endsWith('.apps.googleusercontent.com') && 
    (googleClientSecret?.startsWith('GOCSPX-') || (googleClientSecret?.length ?? 0) > 20);
  
  results.checks.push({
    name: 'GOOGLE_CLIENT_ID',
    status: googleClientId ? 'present' : 'missing',
    preview: googleClientId ? `${googleClientId.substring(0, 25)}...` : null,
    looksValid: googleClientId?.endsWith('.apps.googleusercontent.com') ?? false,
  });
  results.checks.push({
    name: 'GOOGLE_CLIENT_SECRET',
    status: googleClientSecret ? 'present' : 'missing',
    preview: googleClientSecret ? `${googleClientSecret.substring(0, 10)}...` : null,
    looksValid: googleClientSecret?.startsWith('GOCSPX-') ?? false,
  });
  if (isPlaceholder) {
    results.errors.push('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing or still "placeholder" - add real credentials in Vercel');
  } else if (!hasValidFormat) {
    results.errors.push('Credentials may be wrong format - Client ID should end with .apps.googleusercontent.com, Secret should start with GOCSPX-');
  } else {
    results.checks.push({
      name: 'Google OAuth Redirect URI',
      status: 'configured',
      value: googleRedirectUri,
      instruction: 'This EXACT URL must be in Google Cloud Console → OAuth client → Authorized redirect URIs',
    });
  }

  // Check 6: Test user lookup
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
