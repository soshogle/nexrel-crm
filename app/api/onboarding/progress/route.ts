
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrors } from '@/lib/api-error';


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
        onboardingProgress: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      progress: user?.onboardingProgress || {},
      completed: user?.onboardingCompleted || false,
    });
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return apiErrors.internal("Failed to fetch progress");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }

    const { progress, completed } = await req.json();

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        onboardingProgress: progress || {},
        onboardingCompleted: completed || false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving onboarding progress:", error);
    return apiErrors.internal("Failed to save progress");
  }
}
