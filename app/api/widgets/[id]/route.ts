
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';
import { apiErrors } from '@/lib/api-error';

/**
 * GET /api/widgets/[id]
 * Get widget by ID
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const widget = await widgetService.getWidget(params.id, session.user.id);

    if (!widget) {
      return apiErrors.notFound('Widget not found');
    }

    // Generate embed code
    const embedCode = widgetService.generateEmbedCode(widget);

    return NextResponse.json({
      widget,
      embedCode,
    });
  } catch (error: any) {
    console.error('Error fetching widget:', error);
    return apiErrors.internal(error.message || 'Failed to fetch widget');
  }
}

/**
 * PATCH /api/widgets/[id]
 * Update widget configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();

    const widget = await widgetService.updateWidget(
      params.id,
      session.user.id,
      body
    );

    // Generate updated embed code
    const embedCode = widgetService.generateEmbedCode(widget);

    return NextResponse.json({
      widget,
      embedCode,
      message: 'Widget updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating widget:', error);
    return apiErrors.internal(error.message || 'Failed to update widget');
  }
}

/**
 * DELETE /api/widgets/[id]
 * Delete widget
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    await widgetService.deleteWidget(params.id, session.user.id);

    return NextResponse.json({
      message: 'Widget deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting widget:', error);
    return apiErrors.internal(error.message || 'Failed to delete widget');
  }
}
