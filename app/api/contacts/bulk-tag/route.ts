import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { leadService } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import { sanitizeTags } from "@/lib/contact-input";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { contactIds, tags, action = "add" } = body;
    const normalizedTags = sanitizeTags(tags);

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return apiErrors.badRequest("Invalid contact IDs");
    }

    if (!Array.isArray(tags) || normalizedTags.length === 0) {
      return apiErrors.badRequest("Invalid tags");
    }

    // Verify all contacts belong to the user
    const contacts = await leadService.findMany(ctx, {
      where: { id: { in: contactIds } },
      select: { id: true, tags: true },
    });

    if (contacts.length !== contactIds.length) {
      return apiErrors.forbidden("Some contacts not found or unauthorized");
    }

    // Update tags for each contact
    const updatePromises = contacts.map((contact: any) => {
      let existingTags = sanitizeTags(contact.tags);
      let newTags: string[];

      if (action === "add") {
        // Add new tags without duplicates
        newTags = [...new Set([...existingTags, ...normalizedTags])];
      } else if (action === "replace") {
        // Replace all tags
        newTags = normalizedTags;
      } else if (action === "remove") {
        // Remove specified tags
        newTags = existingTags.filter(
          (tag: any) => !normalizedTags.includes(tag),
        );
      } else {
        newTags = existingTags;
      }

      return leadService.update(ctx, contact.id, {
        tags: sanitizeTags(newTags),
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      updated: contacts.length,
    });
  } catch (error) {
    console.error("Error bulk tagging contacts:", error);
    return apiErrors.internal("Failed to update tags");
  }
}
