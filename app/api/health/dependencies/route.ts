import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDependencyHealthOverview } from "@/lib/reliability/dependency-health";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const internalAuthorized =
    !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!session?.user?.id && !internalAuthorized) {
    return apiErrors.unauthorized("Authentication required");
  }

  return NextResponse.json(getDependencyHealthOverview());
}
