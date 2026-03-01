import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { provisionAIEmployeesForUser } from "@/lib/ai-employee-auto-provision";
import { apiErrors } from '@/lib/api-error';

// GET user profile

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        phone: true,
        address: true,
        website: true,
        businessDescription: true,
        industry: true,
        timezone: true,
        country: true,
      },
    });

    if (!user) {
      return apiErrors.notFound("User not found");
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return apiErrors.internal("Failed to fetch user profile", error.message);
  }
}

// PATCH update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const { name, companyName, image, phone, address, website, businessDescription, industry, timezone, country } = body;

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (companyName !== undefined) updateData.name = companyName;
    if (image !== undefined) updateData.image = image;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (website !== undefined) updateData.website = website || null;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription || null;
    if (industry !== undefined) updateData.industry = industry || null;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (country !== undefined) updateData.country = country;

    if (Object.keys(updateData).length === 0) {
      return apiErrors.badRequest("No fields to update");
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        phone: true,
        address: true,
        website: true,
        businessDescription: true,
        industry: true,
        timezone: true,
        country: true,
      },
    });

    if (updateData.industry !== undefined) {
      provisionAIEmployeesForUser(user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return apiErrors.internal("Failed to update user profile", error.message);
  }
}
