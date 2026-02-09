/**
 * Real-time Stock Updates API
 * Provides Server-Sent Events (SSE) or polling endpoint for real-time stock updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { websiteStockSyncService } from '@/lib/website-builder/stock-sync-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' or 'sse'

    if (format === 'sse') {
      // Server-Sent Events for real-time updates
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          // Send initial status
          const status = await websiteStockSyncService.getWebsiteStockStatus(params.id);
          send({ type: 'initial', data: status });

          // Poll for changes every 5 seconds
          const interval = setInterval(async () => {
            try {
              const currentStatus = await websiteStockSyncService.getWebsiteStockStatus(params.id);
              send({ type: 'update', data: currentStatus });
            } catch (error) {
              send({ type: 'error', error: 'Failed to fetch status' });
            }
          }, 5000);

          // Cleanup on close
          request.signal.addEventListener('abort', () => {
            clearInterval(interval);
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // JSON polling endpoint
      const status = await websiteStockSyncService.getWebsiteStockStatus(params.id);
      const healthScore = await websiteStockSyncService.calculateInventoryHealthScore(params.id);

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        status: {
          ...status,
          healthScore,
        },
      });
    }
  } catch (error: any) {
    console.error('Error fetching real-time stock:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock updates' },
      { status: 500 }
    );
  }
}
