
/**
 * Widget Preview API
 * Returns widget configuration and products for preview
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preview = await widgetService.getWidgetPreview(
      params.id,
      session.user.id
    );

    return NextResponse.json({ preview });
  } catch (error: any) {
    console.error('Error fetching widget preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview', details: error.message },
      { status: 500 }
    );
  }
}
