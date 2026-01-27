
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * ROUTE POS ORDER TO KITCHEN
 * Creates kitchen items from POS order and assigns to stations
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { posOrderId, stationAssignments } = body;

    // Validate required fields
    if (!posOrderId) {
      return NextResponse.json(
        { error: 'POS Order ID is required' },
        { status: 400 }
      );
    }

    // Get POS order with items
    const posOrder = await prisma.pOSOrder.findFirst({
      where: {
        id: posOrderId,
        userId: session.user.id,
      },
      include: {
        items: true,
      },
    });

    if (!posOrder) {
      return NextResponse.json(
        { error: 'POS order not found' },
        { status: 404 }
      );
    }

    // Check if order already routed to kitchen
    const existingKitchenItems = await prisma.kitchenOrderItem.findMany({
      where: { posOrderId },
    });

    if (existingKitchenItems.length > 0) {
      return NextResponse.json(
        { error: 'Order already routed to kitchen' },
        { status: 400 }
      );
    }

    // Get available stations
    const stations = await prisma.kitchenStation.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (stations.length === 0) {
      return NextResponse.json(
        { error: 'No active kitchen stations available' },
        { status: 400 }
      );
    }

    // Auto-assign stations if not provided
    const assignments = stationAssignments || autoAssignStations(posOrder.items, stations);

    // Create kitchen items
    const kitchenItems = await Promise.all(
      posOrder.items.map(async (item: any) => {
        const stationId = assignments[item.id] || stations[0].id;
        const station = stations.find((s) => s.id === stationId) || stations[0];

        const kitchenItem = await prisma.kitchenOrderItem.create({
          data: {
            userId: session.user.id,
            posOrderId: posOrder.id,
            posOrderItemId: item.id,
            stationId,
            itemName: item.name,
            quantity: item.quantity,
            modifiers: item.modifiers,
            specialNotes: item.notes,
            status: 'PENDING',
            priority: determinePriority(posOrder) as any,
            expectedTime: station.defaultPrepTime,
            alertAt: new Date(Date.now() + station.defaultPrepTime * 60 * 1000),
          },
          include: {
            station: true,
          },
        });

        // Create initial prep log
        await prisma.prepLog.create({
          data: {
            kitchenItemId: kitchenItem.id,
            action: 'RECEIVED' as any,
            newStatus: 'PENDING' as any,
            notes: `Order received from POS: ${posOrder.orderNumber}`,
          },
        });

        return kitchenItem;
      })
    );

    // Update POS order status
    await prisma.pOSOrder.update({
      where: { id: posOrderId },
      data: { status: 'PREPARING' },
    });

    console.log(`✅ Order ${posOrder.orderNumber} routed to kitchen with ${kitchenItems.length} items`);

    return NextResponse.json({
      success: true,
      kitchenItems,
      orderNumber: posOrder.orderNumber,
    });
  } catch (error) {
    console.error('❌ Order routing error:', error);
    return NextResponse.json(
      { error: 'Failed to route order to kitchen' },
      { status: 500 }
    );
  }
}

/**
 * Auto-assign items to stations based on keywords
 */
function autoAssignStations(items: any[], stations: any[]): Record<string, string> {
  const assignments: Record<string, string> = {};

  // Station keywords mapping
  const stationKeywords: Record<string, string[]> = {
    grill: ['burger', 'steak', 'chicken', 'beef', 'grill'],
    fryer: ['fries', 'fried', 'wings', 'nuggets', 'tempura'],
    salad: ['salad', 'fresh', 'vegetable', 'greens'],
    drinks: ['drink', 'beverage', 'soda', 'juice', 'water'],
    dessert: ['dessert', 'cake', 'ice cream', 'sweet'],
  };

  items.forEach((item) => {
    const itemNameLower = item.name.toLowerCase();

    // Try to match with station keywords
    let assignedStation = null;
    for (const [stationType, keywords] of Object.entries(stationKeywords)) {
      if (keywords.some((keyword) => itemNameLower.includes(keyword))) {
        assignedStation = stations.find(
          (s) => s.name.toLowerCase().includes(stationType)
        );
        if (assignedStation) break;
      }
    }

    // Fallback to first station
    assignments[item.id] = assignedStation?.id || stations[0].id;
  });

  return assignments;
}

/**
 * Determine order priority
 */
function determinePriority(order: any): string {
  // Priority logic:
  // - DRIVE_THRU = URGENT
  // - DELIVERY = HIGH
  // - TAKEOUT = NORMAL
  // - DINE_IN = NORMAL

  if (order.orderType === 'DRIVE_THRU') {
    return 'URGENT';
  }
  if (order.orderType === 'DELIVERY') {
    return 'HIGH';
  }
  return 'NORMAL';
}
