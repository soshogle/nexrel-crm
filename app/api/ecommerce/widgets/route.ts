
/**
 * E-commerce Widget API
 * Manages widget configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { widgetService } from '@/lib/ecommerce/widget-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const widgets = await widgetService.getWidgets(session.user.id);

    return NextResponse.json({ widgets });
  } catch (error: any) {
    console.error('Error fetching widgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch widgets', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Widget name is required' },
        { status: 400 }
      );
    }

    const widget = await widgetService.createWidget({
      userId: session.user.id,
      ...body,
    });

    return NextResponse.json({ widget });
  } catch (error: any) {
    console.error('Error creating widget:', error);
    return NextResponse.json(
      { error: 'Failed to create widget', details: error.message },
      { status: 500 }
    );
  }
}
