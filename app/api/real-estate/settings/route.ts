export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

type RESettingsState = {
  licenseNumber?: string;
  serviceAreas?: string;
  notifications?: Record<string, boolean>;
  voiceSettings?: Record<string, any>;
  apiSettings?: Record<string, any>;
};

function normalizeSettings(input: any): RESettingsState {
  if (!input || typeof input !== 'object') return {};
  return {
    licenseNumber: typeof input.licenseNumber === 'string' ? input.licenseNumber : '',
    serviceAreas: typeof input.serviceAreas === 'string' ? input.serviceAreas : '',
    notifications: input.notifications && typeof input.notifications === 'object' ? input.notifications : {},
    voiceSettings: input.voiceSettings && typeof input.voiceSettings === 'object' ? input.voiceSettings : {},
    apiSettings: input.apiSettings && typeof input.apiSettings === 'object' ? input.apiSettings : {},
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        legalEntityName: true,
        email: true,
        phone: true,
        website: true,
        businessDescription: true,
        onboardingProgress: true,
      },
    });
    if (!user) return apiErrors.notFound('User not found');

    const onboarding = (user.onboardingProgress as Record<string, any> | null) || {};
    const reSettings = normalizeSettings(onboarding.realEstateSettings);

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: session.user.id,
        service: 'real_estate',
        isActive: true,
      },
      select: { keyName: true, keyValue: true },
    });
    const keyMap = new Map(apiKeys.map((k) => [k.keyName, k.keyValue]));

    return NextResponse.json({
      profile: {
        agentName: user.name || '',
        brokerageName: user.legalEntityName || '',
        licenseNumber: reSettings.licenseNumber || '',
        email: user.email || '',
        phone: user.phone || '',
        website: user.website || '',
        bio: user.businessDescription || '',
        serviceAreas: reSettings.serviceAreas || '',
      },
      apiSettings: {
        mlsProvider: String(reSettings.apiSettings?.mlsProvider || 'rets'),
        mlsApiKey: keyMap.get('mls_api_key') || '',
        gammaApiKey: keyMap.get('gamma_api_key') || '',
        zillowApiKey: keyMap.get('zillow_api_key') || '',
      },
      notifications: {
        newFsboLeads: Boolean(reSettings.notifications?.newFsboLeads ?? true),
        expiredListings: Boolean(reSettings.notifications?.expiredListings ?? true),
        priceChanges: Boolean(reSettings.notifications?.priceChanges ?? true),
        cmaCompleted: Boolean(reSettings.notifications?.cmaCompleted ?? false),
        dailyDigest: Boolean(reSettings.notifications?.dailyDigest ?? true),
        smsAlerts: Boolean(reSettings.notifications?.smsAlerts ?? false),
      },
      voiceSettings: {
        autoDialEnabled: Boolean(reSettings.voiceSettings?.autoDialEnabled ?? false),
        callRecording: Boolean(reSettings.voiceSettings?.callRecording ?? true),
        maxCallsPerDay: String(reSettings.voiceSettings?.maxCallsPerDay ?? '50'),
        callHoursStart: String(reSettings.voiceSettings?.callHoursStart ?? '09:00'),
        callHoursEnd: String(reSettings.voiceSettings?.callHoursEnd ?? '18:00'),
        voiceStyle: String(reSettings.voiceSettings?.voiceStyle ?? 'professional'),
      },
    });
  } catch (error) {
    console.error('RE settings GET error:', error);
    return apiErrors.internal('Failed to load settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json();
    const profile = body?.profile || {};
    const apiSettings = body?.apiSettings || {};
    const notifications = body?.notifications || {};
    const voiceSettings = body?.voiceSettings || {};

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    });
    if (!existingUser) return apiErrors.notFound('User not found');

    const currentOnboarding = (existingUser.onboardingProgress as Record<string, any> | null) || {};
    const currentSettings = normalizeSettings(currentOnboarding.realEstateSettings);
    const nextSettings: RESettingsState = {
      ...currentSettings,
      licenseNumber: String(profile.licenseNumber || ''),
      serviceAreas: String(profile.serviceAreas || ''),
      notifications,
      voiceSettings,
      apiSettings: {
        ...(currentSettings.apiSettings || {}),
        mlsProvider: String(apiSettings.mlsProvider || 'rets'),
      },
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: String(profile.agentName || '') || null,
        legalEntityName: String(profile.brokerageName || '') || null,
        phone: String(profile.phone || '') || null,
        website: String(profile.website || '') || null,
        businessDescription: String(profile.bio || '') || null,
        onboardingProgress: {
          ...currentOnboarding,
          realEstateSettings: nextSettings,
        },
      },
    });

    const upsertKey = async (keyName: string, keyValue: string) => {
      if (!keyValue) return;
      await prisma.apiKey.upsert({
        where: {
          userId_service_keyName: {
            userId: session.user.id,
            service: 'real_estate',
            keyName,
          },
        },
        update: {
          keyValue,
          isActive: true,
        },
        create: {
          userId: session.user.id,
          service: 'real_estate',
          keyName,
          keyValue,
          isActive: true,
        },
      });
    };

    await Promise.all([
      upsertKey('mls_api_key', String(apiSettings.mlsApiKey || '')),
      upsertKey('gamma_api_key', String(apiSettings.gammaApiKey || '')),
      upsertKey('zillow_api_key', String(apiSettings.zillowApiKey || '')),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RE settings PUT error:', error);
    return apiErrors.internal('Failed to save settings');
  }
}
