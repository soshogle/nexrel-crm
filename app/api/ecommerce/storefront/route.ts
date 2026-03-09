import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

// GET /api/ecommerce/storefront - Get user's storefront

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const storefront = await db.storefront.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!storefront) {
      return apiErrors.notFound("Storefront not found");
    }

    return NextResponse.json(storefront);
  } catch (error) {
    console.error("Error fetching storefront:", error);
    return apiErrors.internal("Failed to fetch storefront");
  }
}

// POST /api/ecommerce/storefront - Create a new storefront
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Check if storefront already exists
    const existingStorefront = await db.storefront.findUnique({
      where: { userId: session.user.id },
    });

    if (existingStorefront) {
      return apiErrors.badRequest("Storefront already exists");
    }

    const body = await req.json();
    const {
      storeName,
      domain,
      subdomain,
      description,
      primaryColor,
      secondaryColor,
    } = body;

    if (!storeName) {
      return apiErrors.badRequest("Store name is required");
    }

    const storefront = await db.storefront.create({
      data: {
        userId: session.user.id,
        storeName,
        domain,
        subdomain,
        description,
        primaryColor: primaryColor || "#8b5cf6",
        secondaryColor: secondaryColor || "#ffffff",
      },
    });

    return NextResponse.json(storefront, { status: 201 });
  } catch (error) {
    console.error("Error creating storefront:", error);
    return apiErrors.internal("Failed to create storefront");
  }
}

// PATCH /api/ecommerce/storefront - Update storefront
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const body = await req.json();

    const storefront = await db.storefront.update({
      where: { userId: session.user.id },
      data: {
        ...(body.storeName && { storeName: body.storeName }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.subdomain !== undefined && { subdomain: body.subdomain }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.bannerUrl !== undefined && { bannerUrl: body.bannerUrl }),
        ...(body.faviconUrl !== undefined && { faviconUrl: body.faviconUrl }),
        ...(body.primaryColor && { primaryColor: body.primaryColor }),
        ...(body.secondaryColor && { secondaryColor: body.secondaryColor }),
        ...(body.accentColor && { accentColor: body.accentColor }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.aboutPage !== undefined && { aboutPage: body.aboutPage }),
        ...(body.shippingPolicy !== undefined && {
          shippingPolicy: body.shippingPolicy,
        }),
        ...(body.returnPolicy !== undefined && {
          returnPolicy: body.returnPolicy,
        }),
        ...(body.privacyPolicy !== undefined && {
          privacyPolicy: body.privacyPolicy,
        }),
        ...(body.termsOfService !== undefined && {
          termsOfService: body.termsOfService,
        }),
        ...(body.socialMedia && { socialMedia: body.socialMedia }),
        ...(body.contactEmail !== undefined && {
          contactEmail: body.contactEmail,
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone,
        }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.published !== undefined && {
          published: body.published,
          ...(body.published && { publishedAt: new Date() }),
        }),
        ...(body.customCSS !== undefined && { customCSS: body.customCSS }),
        ...(body.customJS !== undefined && { customJS: body.customJS }),
        ...(body.metaTags && { metaTags: body.metaTags }),
        ...(body.analyticsId !== undefined && {
          analyticsId: body.analyticsId,
        }),
        ...(body.facebookPixel !== undefined && {
          facebookPixel: body.facebookPixel,
        }),
      },
    });

    return NextResponse.json(storefront);
  } catch (error) {
    console.error("Error updating storefront:", error);
    return apiErrors.internal("Failed to update storefront");
  }
}
