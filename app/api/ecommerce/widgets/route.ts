
/**
 * E-commerce Widget API
 * Manages widget configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const widgets = await widgetService.getWidgets(session.user.id);

    return NextResponse.json({ widgets });
  } catch (error: any) {
    console.error('Error fetching widgets:', error);
    return apiErrors.internal('Failed to fetch widgets', error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    
    if (!body.name) {
      return apiErrors.badRequest('Widget name is required');
    }

    const widget = await widgetService.createWidget({
      userId: session.user.id,
      ...body,
    });

    return NextResponse.json({ widget });
  } catch (error: any) {
    console.error('Error creating widget:', error);
    return apiErrors.internal('Failed to create widget', error.message);
  }
}
