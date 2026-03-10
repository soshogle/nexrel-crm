export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { REPropertyType, REListingStatus } from "@prisma/client";
import {
  syncListingToWebsite,
  syncStatusToWebsite,
  getWebsiteListingOrderForCrmMatch,
} from "@/lib/website-builder/listings-service";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { websiteService } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as REListingStatus | null;
    const propertyType = searchParams.get(
      "propertyType",
    ) as REPropertyType | null;
    const limit = parseInt(searchParams.get("limit") || "50");
    const resolveScopedUserIds = async (
      db: ReturnType<typeof getCrmDb>,
    ): Promise<string[]> => {
      const ids = new Set<string>([session.user.id]);
      if (session.user.email) {
        const emailUser = await db.user.findFirst({
          where: { email: session.user.email },
          select: { id: true },
        });
        if (emailUser?.id) ids.add(emailUser.id);
      }
      if (session.user.role !== "BUSINESS_OWNER" && session.user.agencyId) {
        const owner = await db.user.findFirst({
          where: {
            agencyId: session.user.agencyId,
            role: "BUSINESS_OWNER",
            deletedAt: null,
          },
          select: { id: true },
        });
        if (owner?.id) ids.add(owner.id);
      }
      return Array.from(ids);
    };

    const scopedUserIds = await resolveScopedUserIds(getCrmDb(ctx));

    let properties = await getCrmDb(ctx).rEProperty.findMany({
      where: {
        userId:
          scopedUserIds.length === 1 ? scopedUserIds[0] : { in: scopedUserIds },
        ...(status && { listingStatus: status }),
        ...(propertyType && { propertyType }),
      },
      include: {
        sellerLead: {
          select: { id: true, contactPerson: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const effectiveIndustry =
      ctx.industry ?? resolvedCtx?.industry ?? session.user.industry ?? null;
    const industryEnvKey = effectiveIndustry
      ? `DATABASE_URL_${effectiveIndustry}`
      : null;
    if (
      properties.length === 0 &&
      ctx.databaseEnvKey &&
      industryEnvKey &&
      industryEnvKey !== ctx.databaseEnvKey &&
      process.env[industryEnvKey]
    ) {
      const fallbackDb = getCrmDb({
        ...ctx,
        databaseEnvKey: industryEnvKey,
      });
      const fallbackScopedUserIds = await resolveScopedUserIds(fallbackDb);
      properties = await fallbackDb.rEProperty.findMany({
        where: {
          userId:
            fallbackScopedUserIds.length === 1
              ? fallbackScopedUserIds[0]
              : { in: fallbackScopedUserIds },
          ...(status && { listingStatus: status }),
          ...(propertyType && { propertyType }),
        },
        include: {
          sellerLead: {
            select: {
              id: true,
              contactPerson: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    }

    // Align order with broker's website (is_featured DESC, created_at DESC)
    const website = await websiteService.findFirst(ctx, {
      templateType: "SERVICE",
    });
    const baseUrl = (
      website as { vercelDeploymentUrl?: string | null }
    )?.vercelDeploymentUrl?.replace(/\/$/, "");
    if (website) {
      try {
        const websiteOrder = await getWebsiteListingOrderForCrmMatch(
          website.id,
        );
        if (websiteOrder.length > 0) {
          const orderMap = new Map<string, number>();
          websiteOrder.forEach((item, idx) => {
            const mls = (item.mls_number || "").trim().toLowerCase();
            const addr = (item.address || "").trim().toLowerCase();
            if (mls && !orderMap.has(`mls:${mls}`))
              orderMap.set(`mls:${mls}`, idx);
            if (addr && !orderMap.has(`addr:${addr}`))
              orderMap.set(`addr:${addr}`, idx);
          });
          const posFor = (p: (typeof properties)[0]) => {
            const mls = (p.mlsNumber || "").trim().toLowerCase();
            const fullAddr =
              `${p.address || ""}, ${p.city || ""}, ${p.state || ""} ${p.zip || ""}`
                .trim()
                .toLowerCase();
            return (
              orderMap.get(`mls:${mls}`) ??
              orderMap.get(`addr:${fullAddr}`) ??
              orderMap.get(`addr:${(p.address || "").toLowerCase()}`) ??
              9999
            );
          };
          properties.sort((a, b) => posFor(a) - posFor(b));
        }
      } catch {
        // Keep default order if website order fetch fails
      }
    }

    // Add website listing URL for each property (opens on owner's site)
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 120);
    const propsWithUrl = properties.map((p) => {
      const fullAddr =
        `${p.address || ""}, ${p.city || ""}, ${p.state || ""} ${p.zip || ""}`.trim();
      const slug = slugify(fullAddr);
      const websiteListingUrl =
        baseUrl && slug ? `${baseUrl}/properties/${slug}` : undefined;
      return { ...p, websiteListingUrl };
    });

    return NextResponse.json({ properties: propsWithUrl });
  } catch (error) {
    console.error("Properties GET error:", error);
    return apiErrors.internal("Failed to fetch properties");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      address,
      unit,
      city,
      state,
      zip,
      country,
      beds,
      baths,
      sqft,
      lotSize,
      yearBuilt,
      propertyType,
      listingStatus,
      listPrice,
      mlsNumber,
      photos,
      virtualTourUrl,
      description,
      features,
      sellerLeadId,
      listingDate,
      expirationDate,
    } = body;

    if (!address || !city || !state || !zip) {
      return apiErrors.badRequest(
        "Address, city, province, and postal code are required",
      );
    }

    const property = await getCrmDb(ctx).rEProperty.create({
      data: {
        userId: session.user.id,
        address,
        unit,
        city,
        state,
        zip,
        country: country || (session.user as any).country || "CA",
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        sqft: sqft ? parseInt(sqft) : null,
        lotSize: lotSize ? parseInt(lotSize) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        propertyType: (propertyType as REPropertyType) || "SINGLE_FAMILY",
        listingStatus: (listingStatus as REListingStatus) || "ACTIVE",
        listPrice: listPrice ? parseFloat(listPrice) : null,
        mlsNumber,
        photos: photos || [],
        virtualTourUrl,
        description,
        features: features || [],
        sellerLeadId,
        isBrokerListing: body.isBrokerListing === true || !!sellerLeadId,
        listingDate: listingDate ? new Date(listingDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
    });

    // Sync listing to owner's SERVICE website (fire-and-forget)
    syncListingToWebsite(session.user.id, {
      address,
      city,
      state,
      zip,
      country,
      beds: beds ? parseInt(beds) : null,
      baths: baths ? parseFloat(baths) : null,
      sqft: sqft ? parseInt(sqft) : null,
      propertyType,
      listingStatus,
      listPrice: listPrice ? parseFloat(listPrice) : null,
      mlsNumber,
      photos,
      description,
      features,
      lat: body.lat,
      lng: body.lng,
      virtualTourUrl,
      isBrokerListing: true, // Manual create in CRM = broker's listing
    })
      .then((r) => {
        if (r.success)
          console.log(`[Properties POST] Synced to website ${r.websiteId}`);
        else if (r.error)
          console.warn("[Properties POST] Website sync skipped:", r.error);
      })
      .catch((e) =>
        console.warn("[Properties POST] Website sync error:", e.message),
      );

    return NextResponse.json({ property, success: true });
  } catch (error) {
    console.error("Properties POST error:", error);
    return apiErrors.internal("Failed to create property");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return apiErrors.badRequest("Property ID required");
    }

    const existing = await getCrmDb(ctx).rEProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound("Property not found");
    }

    const property = await getCrmDb(ctx).rEProperty.update({
      where: { id },
      data: {
        ...(updateData.address && { address: updateData.address }),
        ...(updateData.unit !== undefined && { unit: updateData.unit || null }),
        ...(updateData.city && { city: updateData.city }),
        ...(updateData.state && { state: updateData.state }),
        ...(updateData.zip && { zip: updateData.zip }),
        ...(updateData.country && { country: updateData.country }),
        ...(updateData.beds !== undefined && {
          beds: updateData.beds ? parseInt(updateData.beds) : null,
        }),
        ...(updateData.baths !== undefined && {
          baths: updateData.baths ? parseFloat(updateData.baths) : null,
        }),
        ...(updateData.sqft !== undefined && {
          sqft: updateData.sqft ? parseInt(updateData.sqft) : null,
        }),
        ...(updateData.lotSize !== undefined && {
          lotSize: updateData.lotSize ? parseInt(updateData.lotSize) : null,
        }),
        ...(updateData.yearBuilt !== undefined && {
          yearBuilt: updateData.yearBuilt
            ? parseInt(updateData.yearBuilt)
            : null,
        }),
        ...(updateData.propertyType && {
          propertyType: updateData.propertyType as REPropertyType,
        }),
        ...(updateData.listPrice !== undefined && {
          listPrice: updateData.listPrice
            ? parseFloat(updateData.listPrice)
            : null,
        }),
        ...(updateData.listingStatus && {
          listingStatus: updateData.listingStatus as REListingStatus,
        }),
        ...(updateData.mlsNumber !== undefined && {
          mlsNumber: updateData.mlsNumber || null,
        }),
        ...(updateData.description !== undefined && {
          description: updateData.description || null,
        }),
        ...(updateData.features !== undefined && {
          features: updateData.features || [],
        }),
        ...(updateData.photos !== undefined && {
          photos: updateData.photos || [],
        }),
        ...(updateData.virtualTourUrl !== undefined && {
          virtualTourUrl: updateData.virtualTourUrl || null,
        }),
        ...(updateData.daysOnMarket !== undefined && {
          daysOnMarket: parseInt(updateData.daysOnMarket),
        }),
        ...(updateData.isBrokerListing !== undefined && {
          isBrokerListing: !!updateData.isBrokerListing,
        }),
      },
    });

    // Re-sync full data to owner's website after update
    syncListingToWebsite(session.user.id, {
      address: property.address,
      city: property.city,
      state: property.state,
      zip: property.zip,
      country: property.country,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      propertyType: property.propertyType,
      listingStatus: property.listingStatus,
      listPrice: property.listPrice,
      mlsNumber: property.mlsNumber,
      photos: property.photos as string[] | null,
      description: property.description,
      features: property.features,
      virtualTourUrl: property.virtualTourUrl,
      isBrokerListing: property.isBrokerListing ?? false,
    })
      .then((r) => {
        if (r.success)
          console.log(`[Properties PUT] Re-synced to website ${r.websiteId}`);
      })
      .catch((e) =>
        console.warn("[Properties PUT] Website sync error:", e.message),
      );

    // Also explicitly sync status to website DB for all matching listings
    if (updateData.listingStatus) {
      syncStatusToWebsite(
        session.user.id,
        property.mlsNumber,
        property.address,
        property.listingStatus,
      ).catch((e) =>
        console.warn("[Properties PUT] Status sync error:", e.message),
      );
    }

    return NextResponse.json({ property, success: true });
  } catch (error) {
    console.error("Properties PUT error:", error);
    return apiErrors.internal("Failed to update property");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return apiErrors.badRequest("Property ID required");
    }

    const existing = await getCrmDb(ctx).rEProperty.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return apiErrors.notFound("Property not found");
    }

    await getCrmDb(ctx).rEProperty.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Properties DELETE error:", error);
    return apiErrors.internal("Failed to delete property");
  }
}
