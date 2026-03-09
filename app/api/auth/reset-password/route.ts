import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import bcrypt from "bcryptjs";
import { apiErrors } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return apiErrors.badRequest("Token and password are required");
    }

    const user = await getMetaDb().user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return apiErrors.badRequest("Invalid or expired reset link.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await getMetaDb().user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return apiErrors.internal("Something went wrong. Please try again.");
  }
}
