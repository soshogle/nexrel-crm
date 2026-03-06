import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { getIndustryDb, type IndustryDbKey } from "@/lib/db/industry-db";
import type { Industry as MetaIndustry } from "@prisma/client";
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { ClinicProvider } from "@/lib/dental/clinic-context";

export const dynamic = "force-dynamic";

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

function toMetaIndustry(value: unknown): MetaIndustry | null {
  if (typeof value !== "string") return null;
  return INDUSTRY_KEYS.includes(value as IndustryDbKey)
    ? (value as MetaIndustry)
    : null;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Use session data from JWT - industry and accountStatus are in the token
  let accountStatus = session.user?.accountStatus;
  let industry: MetaIndustry | null = toMetaIndustry(session.user?.industry);

  // Fallback: if JWT has no industry but DB does (e.g. set-industry ran, update() didn't persist), fetch from auth DB
  if (
    !industry &&
    session.user?.id &&
    session.user?.role !== "SUPER_ADMIN" &&
    !session.user?.parentRole
  ) {
    try {
      const dbUser = await getMetaDb().user.findUnique({
        where: { id: session.user.id },
        select: { industry: true, accountStatus: true },
      });
      if (dbUser?.industry && toMetaIndustry(dbUser.industry)) {
        industry = dbUser.industry as MetaIndustry;
        if (dbUser.accountStatus) accountStatus = dbUser.accountStatus;
      }
    } catch {
      // Ignore - use session values
    }

    // Last-resort fallback: resolve user from industry DBs (covers stale JWT + null meta industry)
    if (!industry) {
      const triedUrls = new Set<string>();
      if (process.env.DATABASE_URL) triedUrls.add(process.env.DATABASE_URL);

      for (const key of INDUSTRY_KEYS) {
        const envUrl = process.env[`DATABASE_URL_${key}`];
        if (!envUrl || triedUrls.has(envUrl)) continue;
        triedUrls.add(envUrl);

        try {
          const tenantDb = getIndustryDb(key);
          const tenantUser = await tenantDb.user.findUnique({
            where: { id: session.user.id },
            select: { industry: true },
          });

          if (tenantUser) {
            const resolvedIndustry =
              toMetaIndustry(tenantUser.industry) || (key as MetaIndustry);
            industry = resolvedIndustry;

            // Backfill auth DB so future requests resolve quickly
            try {
              await getMetaDb().user.update({
                where: { id: session.user.id },
                data: { industry: resolvedIndustry },
              });
            } catch {
              // Ignore backfill failures; industry is still resolved for this request
            }

            break;
          }
        } catch {
          // Skip unreachable/incompatible tenant DBs
        }
      }
    }
  }

  if (session.user?.role !== "SUPER_ADMIN" && !session.user?.isImpersonating) {
    if (accountStatus === "PENDING_APPROVAL") {
      redirect("/dashboard/pending-approval");
    }

    if (
      session.user?.role !== "PARENT" &&
      !session.user?.parentRole &&
      !industry
    ) {
      redirect("/welcome");
    }
  }

  // ClinicProvider required for dental/orthodontist pages (SharedDashboardLayout, CustomDocumentUpload, etc.)
  const isDentalUser = industry === "DENTIST" || industry === "ORTHODONTIST";

  const content = <DashboardWrapper>{children}</DashboardWrapper>;

  // Wrap with ClinicProvider for dental users
  if (isDentalUser) {
    return <ClinicProvider>{content}</ClinicProvider>;
  }

  return content;
}
