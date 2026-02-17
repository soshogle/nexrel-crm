import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureUserHasVoiceAgent } from '@/lib/ensure-voice-agent';
import { provisionAIEmployeesForUser } from '@/lib/ai-employee-auto-provision';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Whitelist of valid fields that exist in Prisma User model
const VALID_ONBOARDING_FIELDS = new Set([
  'name', 'phone', 'address', 'website', 'businessDescription', 'industry', 'timezone',
  'legalEntityName', 'legalJurisdiction', 'companyLogoUrl',
  'businessCategory', 'industryNiche', 'targetAudience', 'demographics', 'productsServices',
  'operatingLocation', 'businessLanguage', 'currency', 'teamSize', 'businessHours',
  'averageDealValue', 'salesCycleLength', 'leadSources', 'preferredContactMethod',
  'emailProvider', 'emailProviderConfig', 'emailProviderConfigured',
  'smsProvider', 'smsProviderConfig', 'smsProviderConfigured',
  'paymentProvider', 'paymentProviderConfigured',
  'campaignTone', 'primaryMarketingChannel', 'monthlyMarketingBudget',
  'websiteTraffic', 'currentCRM', 'socialMediaProfiles',
  'onboardingProgress', 'onboardingCompleted'
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('[UPDATE-STEP] Received data:', JSON.stringify(data, null, 2));
    console.log('[UPDATE-STEP] User ID:', session.user.id);

    // Filter: include valid fields; undefined = skip, null = clear field
    const updateData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (VALID_ONBOARDING_FIELDS.has(key)) {
        updateData[key] = value;
      } else {
        console.warn(`[UPDATE-STEP] Skipping invalid field: ${key}`);
      }
    }
    updateData.updatedAt = new Date();

    console.log('[UPDATE-STEP] Filtered data to update:', JSON.stringify(updateData, null, 2));

    // Update user with the provided data
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // When onboarding completes, ensure user has a default voice agent and AI employees
    if (updateData.onboardingCompleted === true) {
      try {
        await ensureUserHasVoiceAgent(session.user.id);
      } catch (err) {
        console.warn('[UPDATE-STEP] Could not create default voice agent:', err);
      }
      // Auto-provision AI employees in background (if industry is set)
      provisionAIEmployeesForUser(session.user.id);
    }

    console.log('[UPDATE-STEP] User updated successfully');
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('[UPDATE-STEP] Error updating onboarding step:', error);
    console.error('[UPDATE-STEP] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update onboarding data',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[UPDATE-STEP GET] Fetching user data');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('[UPDATE-STEP GET] No session or user ID found');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[UPDATE-STEP GET] Session user ID:', session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    console.log('[UPDATE-STEP GET] User found:', user ? 'Yes' : 'No');
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error('[UPDATE-STEP GET] Error fetching onboarding data:', error);
    console.error('[UPDATE-STEP GET] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch onboarding data',
        details: error.message
      },
      { status: 500 }
    );
  }
}
