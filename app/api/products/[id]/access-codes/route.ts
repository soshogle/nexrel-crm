/**
 * Product access codes - for digital products
 * POST: Generate access codes
 * GET: List codes for product
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { randomBytes } from "crypto";
import { apiErrors } from "@/lib/api-error";

function generateCode(template?: string | null): string {
  const code = randomBytes(4).toString("hex").toUpperCase();
  return template ? template.replace("{code}", code) : `KEY-${code}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const product = await db.product.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { accessCodes: true },
    });

    if (!product) {
      return apiErrors.notFound("Product not found");
    }

    const unredeemed = product.accessCodes.filter((c) => !c.redeemedAt);
    return NextResponse.json({
      success: true,
      total: product.accessCodes.length,
      unredeemed: unredeemed.length,
      codes: product.accessCodes.map((c) => ({
        id: c.id,
        code: c.code,
        redeemedAt: c.redeemedAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching access codes:", error);
    return apiErrors.internal(error.message || "Failed to fetch codes");
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    const product = await db.product.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!product) {
      return apiErrors.notFound("Product not found");
    }

    const body = await req.json().catch(() => ({}));
    const count = Math.min(Math.max(1, parseInt(body.count, 10) || 1), 100);

    const template = product.accessCodeTemplate || "CODE-{code}";
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code = generateCode(template);
      while (
        codes.includes(code) ||
        (await db.productAccessCode.findUnique({ where: { code } }))
      ) {
        code = generateCode(template);
      }
      codes.push(code);
      await db.productAccessCode.create({
        data: { productId: params.id, code },
      });
    }

    return NextResponse.json({
      success: true,
      generated: count,
      codes,
    });
  } catch (error: any) {
    console.error("Error generating access codes:", error);
    return apiErrors.internal(error.message || "Failed to generate codes");
  }
}
