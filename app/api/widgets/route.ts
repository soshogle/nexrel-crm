
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';

/**
 * GET /api/widgets
 * List all widgets for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const widgets = await widgetService.listWidgets(session.user.id);

    return NextResponse.json({ widgets });
  } catch (error: any) {
    console.error('Error listing widgets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list widgets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/widgets
 * Create a new widget
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      storefrontId,
      theme,
      layout,
      primaryColor,
      accentColor,
      borderRadius,
      productIds,
      categoryFilter,
      maxProducts,
      showOutOfStock,
      showPrices,
      showAddToCart,
      showQuickView,
      showSearch,
      enableCheckout,
      checkoutUrl,
      allowedDomains,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Widget name is required' },
        { status: 400 }
      );
    }

    if (!productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one product must be selected' },
        { status: 400 }
      );
    }

    const widget = await widgetService.createWidget({
      userId: session.user.id,
      name,
      description,
      storefrontId,
      theme,
      layout,
      primaryColor,
      accentColor,
      borderRadius,
      productIds,
      categoryFilter,
      maxProducts,
      showOutOfStock,
      showPrices,
      showAddToCart,
      showQuickView,
      showSearch,
      enableCheckout,
      checkoutUrl,
      allowedDomains,
    });

    // Generate embed code
    const embedCode = widgetService.generateEmbedCode(widget);

    return NextResponse.json({
      widget,
      embedCode,
      message: 'Widget created successfully',
    });
  } catch (error: any) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create widget' },
      { status: 500 }
    );
  }
}
