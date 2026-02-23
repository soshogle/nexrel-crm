
/**
 * Widget Preview API
 * Returns widget configuration and products for preview
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

    const preview = await widgetService.getWidgetPreview(
      params.id,
      session.user.id
    );

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error('Error fetching widget preview:', error);
    return apiErrors.internal('Failed to fetch preview', error.message);
  }
}
