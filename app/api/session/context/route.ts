import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getIndustryDb, type IndustryDbKey } from "@/lib/db/industry-db";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INDUSTRY_KEYS: IndustryDbKey[] = [
  "ACCOUNTING",
  "RESTAURANT",
  "SPORTS_CLUB",
  "CONSTRUCTION",
  "LAW",
  "MEDICAL",
  "DENTIST",
  "MEDICAL_SPA",
  "OPTOMETRIST",
  "HEALTH_CLINIC",
  "REAL_ESTATE",
  "HOSPITAL",
  "TECHNOLOGY",
  "ORTHODONTIST",
  "RETAIL",
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    let industry = (session.user.industry as string | null) || null;

    if (!industry) {
      const mainUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { industry: true },
      });
      industry = (mainUser?.industry as string | null) || null;
    }

    if (!industry) {
      const triedUrls = new Set<string>();
      if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

      for (const key of INDUSTRY_KEYS) {
        const envUrl = process.env[`DATABASE_URL_${key}`];
        if (!envUrl || triedUrls.has(envUrl)) continue;
        triedUrls.add(envUrl);

        try {
          const db = getIndustryDb(key);
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { industry: true },
          });
          if (user) {
            industry = (user.industry as string | null) || key;
            break;
          }
        } catch {
          // skip unreachable or incompatible DBs
        }
      }
    }

    return NextResponse.json({
      industry,
      role: session.user.role || null,
    });
  } catch (error: any) {
    return apiErrors.internal(
      error?.message || "Failed to resolve session context",
    );
  }
}
