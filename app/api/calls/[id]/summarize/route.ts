/**
 * Summarize call transcript and add as note to lead
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { summarizeCallAndAddNote } from "@/lib/call-summary-service";
import { apiErrors } from "@/lib/api-error";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const result = await summarizeCallAndAddNote(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Call summarize error:", error);
    const message = error?.message || "Failed to summarize call";
    if (message.includes("not found") || message.includes("Call not found")) {
      return apiErrors.notFound(message);
    }
    if (message.includes("no transcript")) {
      return apiErrors.badRequest(message);
    }
    return apiErrors.internal(message);
  }
}
