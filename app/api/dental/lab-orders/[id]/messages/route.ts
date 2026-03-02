import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface LabMessageEntry {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  timestamp: string;
  type: string;
}

function parseMessages(raw: string | null | undefined): LabMessageEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// GET - Fetch messages for a lab order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const order = await db.dentalLabOrder.findUnique({
      where: { id: params.id },
      select: { userId: true, internalNotes: true },
    });

    if (!order) {
      return apiErrors.notFound('Lab order not found');
    }

    if (order.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const messages = parseMessages(order.internalNotes);

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error('Error fetching lab messages:', error);
    return apiErrors.internal('Failed to fetch lab messages', error.message);
  }
}

// POST - Add a message to a lab order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const db = getRouteDb(session);

    const order = await db.dentalLabOrder.findUnique({
      where: { id: params.id },
      select: { userId: true, internalNotes: true },
    });

    if (!order) {
      return apiErrors.notFound('Lab order not found');
    }

    if (order.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const body = await request.json();
    const { message, sender, senderName, type } = body;

    if (!message) {
      return apiErrors.badRequest('Message is required');
    }

    const existing = parseMessages(order.internalNotes);

    const newMsg: LabMessageEntry = {
      id: crypto.randomUUID(),
      sender: sender || 'clinic',
      senderName: senderName || session.user.name || 'Clinic Staff',
      message,
      timestamp: new Date().toISOString(),
      type: type || 'message',
    };

    existing.push(newMsg);

    await db.dentalLabOrder.update({
      where: { id: params.id },
      data: { internalNotes: JSON.stringify(existing) },
    });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    console.error('Error saving lab message:', error);
    return apiErrors.internal('Failed to save lab message', error.message);
  }
}
