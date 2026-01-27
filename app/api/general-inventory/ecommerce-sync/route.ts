
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPlatformClient } from '@/lib/ecommerce-platforms';

export const dynamic = 'force-dynamic';

// GET - Get sync configuration
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's e-commerce sync settings
    const settings = await prisma.ecommerceSyncSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Don't expose full credentials, only show if they're configured
    const response = settings ? {
      id: settings.id,
      platform: settings.platform,
      autoSync: settings.autoSync,
      syncInventory: settings.syncInventory,
      syncPrices: settings.syncPrices,
      syncProducts: settings.syncProducts,
      lastSyncAt: settings.lastSyncAt,
      hasShopifyCredentials: !!(settings.shopifyDomain && settings.shopifyAccessToken),
      hasWooCommerceCredentials: !!(settings.woocommerceUrl && settings.woocommerceConsumerKey),
    } : null;

    return NextResponse.json({ settings: response });
  } catch (error: any) {
    console.error('Error fetching sync settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync settings' },
      { status: 500 }
    );
  }
}

// POST - Save sync configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      platform,
      autoSync,
      syncInventory,
      syncPrices,
      syncProducts,
      shopifyDomain,
      shopifyAccessToken,
      woocommerceUrl,
      woocommerceConsumerKey,
      woocommerceConsumerSecret,
    } = body;

    if (!platform || !['shopify', 'woocommerce'].includes(platform)) {
      return NextResponse.json(
        { error: 'Valid platform is required (shopify or woocommerce)' },
        { status: 400 }
      );
    }

    // Validate credentials based on platform
    if (platform === 'shopify' && (!shopifyDomain || !shopifyAccessToken)) {
      return NextResponse.json(
        { error: 'Shopify domain and access token are required' },
        { status: 400 }
      );
    }

    if (platform === 'woocommerce' && (!woocommerceUrl || !woocommerceConsumerKey || !woocommerceConsumerSecret)) {
      return NextResponse.json(
        { error: 'WooCommerce URL, consumer key, and consumer secret are required' },
        { status: 400 }
      );
    }

    // Test the credentials before saving
    try {
      const client = createPlatformClient(platform, {
        shopifyDomain,
        shopifyAccessToken,
        woocommerceUrl,
        woocommerceConsumerKey,
        woocommerceConsumerSecret,
      });

      // Try a simple API call to validate credentials
      if (platform === 'shopify') {
        await (client as any).request('/shop.json');
      } else if (platform === 'woocommerce') {
        await (client as any).request('/system_status');
      }
    } catch (error: any) {
      console.error('Credential validation failed:', error);
      return NextResponse.json(
        { error: `Invalid credentials: ${error.message}` },
        { status: 400 }
      );
    }

    // Save or update settings
    const settings = await prisma.ecommerceSyncSettings.upsert({
      where: { userId: session.user.id },
      update: {
        platform,
        autoSync: autoSync || false,
        syncInventory: syncInventory || false,
        syncPrices: syncPrices || false,
        syncProducts: syncProducts || false,
        shopifyDomain: platform === 'shopify' ? shopifyDomain : null,
        shopifyAccessToken: platform === 'shopify' ? shopifyAccessToken : null,
        woocommerceUrl: platform === 'woocommerce' ? woocommerceUrl : null,
        woocommerceConsumerKey: platform === 'woocommerce' ? woocommerceConsumerKey : null,
        woocommerceConsumerSecret: platform === 'woocommerce' ? woocommerceConsumerSecret : null,
      },
      create: {
        userId: session.user.id,
        platform,
        autoSync: autoSync || false,
        syncInventory: syncInventory || false,
        syncPrices: syncPrices || false,
        syncProducts: syncProducts || false,
        shopifyDomain: platform === 'shopify' ? shopifyDomain : null,
        shopifyAccessToken: platform === 'shopify' ? shopifyAccessToken : null,
        woocommerceUrl: platform === 'woocommerce' ? woocommerceUrl : null,
        woocommerceConsumerKey: platform === 'woocommerce' ? woocommerceConsumerKey : null,
        woocommerceConsumerSecret: platform === 'woocommerce' ? woocommerceConsumerSecret : null,
      },
    });

    return NextResponse.json({ success: true, settings: { id: settings.id } });
  } catch (error: any) {
    console.error('Error saving sync settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save sync settings' },
      { status: 500 }
    );
  }
}
