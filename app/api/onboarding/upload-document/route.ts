import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { documentExtractor } from "@/lib/document-extractor";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const db = getCrmDb(ctx);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return apiErrors.badRequest("File is required");
    }

    // Extract text from document
    const extractedDoc = await documentExtractor.extractText(file);

    if (
      !extractedDoc.success ||
      !extractedDoc.text ||
      extractedDoc.text.trim().length === 0
    ) {
      return apiErrors.badRequest(
        extractedDoc.error || "Could not extract text from document",
      );
    }

    const extractedText = extractedDoc.text;

    // Get current progress
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingProgress: true },
    });

    let progress: any = {};
    if (user?.onboardingProgress) {
      try {
        progress = JSON.parse(user.onboardingProgress as string);
      } catch (e) {
        progress = {};
      }
    }

    // Add extracted text to knowledge base
    if (!progress.uploadedDocuments) {
      progress.uploadedDocuments = [];
    }

    progress.uploadedDocuments.push({
      fileName: file.name,
      fileType: file.type,
      extractedText: extractedText.substring(0, 5000), // Limit to 5000 chars
      uploadedAt: new Date().toISOString(),
    });

    // Save progress
    await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingProgress: JSON.stringify(progress),
      },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      textLength: extractedText.length,
      message: `Extracted ${extractedText.length} characters from ${file.name}`,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return apiErrors.internal(error.message || "Failed to process document");
  }
}
