import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService, websiteService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { runPropertyEvaluation } from "@/lib/real-estate/property-evaluation";

export const dynamic = "force-dynamic";

/**
 * GET — Fetch evaluation leads for the logged-in broker.
 * Returns leads where source = 'property_evaluation'.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const leads = await leadService.findMany(ctx, {
      where: { source: "property_evaluation" },
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        address: true,
        enrichedData: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    } as any);

    const formatted = leads.map((l) => {
      const enriched = (l.enrichedData as Record<string, unknown>) || {};
      return {
        id: l.id,
        name: l.contactPerson || l.businessName || "—",
        email: l.email || "—",
        phone: l.phone || null,
        address: l.address || "—",
        estimatedValue: (enriched.estimatedValue as number) || null,
        comparablesCount: (enriched.comparablesCount as number) || 0,
        status: l.status,
        createdAt: l.createdAt,
      };
    });

    return NextResponse.json({ leads: formatted });
  } catch (error: unknown) {
    console.error("[property-evaluation GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluation leads" },
      { status: 500 }
    );
  }
}

/**
 * POST — Run a broker-side property evaluation (no lead created, no email sent).
 * Requires a SERVICE website with a neonDatabaseUrl.
 * Body: { websiteId, address, city?, bedrooms?, bathrooms?, propertyType? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { websiteId, address, city, postalCode, latitude, longitude, bedrooms, bathrooms, propertyType } =
      body;

    if (!address?.trim()) {
      return NextResponse.json(
        { error: "Property address is required" },
        { status: 400 }
      );
    }

    // Find a SERVICE website for the broker
    let targetWebsiteId = websiteId;
    if (!targetWebsiteId) {
      const site = await websiteService.findFirst(ctx, {
        templateType: "SERVICE",
        neonDatabaseUrl: { not: null },
      });
      targetWebsiteId = site?.id;
    } else {
      const site = await websiteService.findUnique(ctx, targetWebsiteId);
      if (!site) {
        return NextResponse.json(
          { error: "Website not found" },
          { status: 404 }
        );
      }
    }

    if (!targetWebsiteId) {
      return NextResponse.json(
        {
          error:
            "No SERVICE website with a listings database found. Publish a real estate site first.",
        },
        { status: 404 }
      );
    }

    const evaluation = await runPropertyEvaluation(
      targetWebsiteId,
      {
        address: address.trim(),
        city: city?.trim() || undefined,
        postalCode: postalCode?.trim() || undefined,
        latitude: latitude != null ? parseFloat(latitude) : undefined,
        longitude: longitude != null ? parseFloat(longitude) : undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
        propertyType: propertyType || "house",
      },
      session.user.id,
      (session.user as any).industry ?? null
    );

    return NextResponse.json({ evaluation });
  } catch (error: unknown) {
    console.error("[property-evaluation POST]", error);
    return NextResponse.json(
      { error: "Evaluation failed" },
      { status: 500 }
    );
  }
}
