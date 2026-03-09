/**
 * External Calendar Webhook API
 * Receive and process events from external booking systems
 */

import { NextRequest, NextResponse } from "next/server";
import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature/authentication
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey) {
      return apiErrors.unauthorized();
    }

    // Find calendar connection with matching API key
    const connection = await getMetaDb().calendarConnection.findFirst({
      where: {
        apiKey,
        provider: "EXTERNAL_API",
      },
    });

    if (!connection) {
      return apiErrors.unauthorized("Invalid API key");
    }

    const body = await request.json();
    const { event_type, event } = body;

    // Handle different event types
    switch (event_type) {
      case "appointment.created":
      case "appointment.updated":
        await handleAppointmentEvent(connection.userId, event, connection.id);
        break;
      case "appointment.cancelled":
        await handleAppointmentCancellation(connection.userId, event.id);
        break;
      default:
        console.warn(`Unknown event type: ${event_type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return apiErrors.internal("Failed to process webhook");
  }
}

async function handleAppointmentEvent(
  userId: string,
  event: any,
  connectionId: string,
) {
  try {
    const ctx = await resolveDalContext(userId);
    const db = getCrmDb(ctx);
    const appointmentData = {
      calendarConnectionId: connectionId,
      customerName: event.customer_name || event.attendee?.name || "Unknown",
      customerEmail: event.customer_email || event.attendee?.email,
      customerPhone: event.customer_phone || event.attendee?.phone || "",
      appointmentDate: new Date(event.start_time || event.startTime),
      duration: event.duration || 30,
      status: (event.status === "confirmed" ? "CONFIRMED" : "SCHEDULED") as any,
      notes: event.notes || event.description,
      externalEventId: event.id || event.event_id,
      externalEventLink: event.url || event.event_url,
      syncStatus: "SYNCED" as any,
      lastSyncAt: new Date(),
    };

    // Try to find existing appointment by external event ID
    const existing = await db.bookingAppointment.findFirst({
      where: {
        userId,
        externalEventId: appointmentData.externalEventId,
      },
    });

    if (existing) {
      // Update existing
      await db.bookingAppointment.update({
        where: { id: existing.id },
        data: appointmentData,
      });
    } else {
      // Create new (would need callLogId - skip for webhook-only appointments)
      console.log(
        "New external appointment received but requires callLog association",
      );
    }
  } catch (error) {
    console.error("Error handling appointment event:", error);
  }
}

async function handleAppointmentCancellation(
  userId: string,
  externalEventId: string,
) {
  try {
    const ctx = await resolveDalContext(userId);
    const db = getCrmDb(ctx);
    await db.bookingAppointment.updateMany({
      where: {
        userId,
        externalEventId,
      },
      data: {
        status: "CANCELLED",
        syncStatus: "SYNCED",
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error handling appointment cancellation:", error);
  }
}
