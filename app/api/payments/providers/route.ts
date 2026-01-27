
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Get all payment provider settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const providers = await prisma.paymentProviderSettings.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        isActive: true,
        isDefault: true,
        currency: true,
        testMode: true,
        publishableKey: true, // Safe to expose
        createdAt: true,
        updatedAt: true
        // Don't expose secretKey, webhookSecret, etc.
      }
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Error fetching payment providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment providers' },
      { status: 500 }
    );
  }
}

// POST - Create or update payment provider settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      provider,
      publishableKey,
      secretKey,
      webhookSecret,
      merchantId,
      clientId,
      accountId,
      currency = 'USD',
      testMode = true,
      isActive = true,
      isDefault = false
    } = body;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentProviderSettings.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Upsert the provider settings
    const providerSettings = await prisma.paymentProviderSettings.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider
        }
      },
      create: {
        userId: user.id,
        provider,
        publishableKey,
        secretKey,
        webhookSecret,
        merchantId,
        clientId,
        accountId,
        currency,
        testMode,
        isActive,
        isDefault
      },
      update: {
        publishableKey,
        secretKey,
        webhookSecret,
        merchantId,
        clientId,
        accountId,
        currency,
        testMode,
        isActive,
        isDefault
      }
    });

    return NextResponse.json({
      success: true,
      provider: {
        id: providerSettings.id,
        provider: providerSettings.provider,
        isActive: providerSettings.isActive,
        isDefault: providerSettings.isDefault,
        currency: providerSettings.currency,
        testMode: providerSettings.testMode
      }
    });
  } catch (error) {
    console.error('Error saving payment provider:', error);
    return NextResponse.json(
      { error: 'Failed to save payment provider settings' },
      { status: 500 }
    );
  }
}
