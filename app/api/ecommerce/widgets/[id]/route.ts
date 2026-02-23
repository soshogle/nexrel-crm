
/**
 * Individual Widget API
 * Manages specific widget operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';
import { apiErrors } from '@/lib/api-error';


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

    return NextResponse.json({ widget });
  } catch (error: any) {
    console.error('Error fetching widget:', error);
    return apiErrors.internal('Failed to fetch widget', error.message);
  }
}

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

    return NextResponse.json({ widget });
  } catch (error: any) {
    console.error('Error updating widget:', error);
    return apiErrors.internal('Failed to update widget', error.message);
  }
}

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting widget:', error);
    return apiErrors.internal('Failed to delete widget', error.message);
  }
}
