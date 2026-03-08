import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { sendSMS } from "@/lib/twilio";
import { emitCRMEvent } from "@/lib/crm-event-emitter";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function personalizeContent(
  content: string,
  vars: Record<string, string>,
): string {
  if (!content) return "";
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const doublePattern = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    const singlePattern = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(doublePattern, value).replace(singlePattern, value);
  }
  return result;
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
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const campaign = await db.smsCampaign.findUnique({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        recipients: {
          where: { status: "PENDING" },
          include: {
            lead: {
              select: {
                contactPerson: true,
                businessName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    await db.smsCampaign.update({
      where: { id: params.id },
      data: { status: "SENDING", sentAt: new Date() },
    });

    let sentCount = 0;
    let failCount = 0;

    for (const recipient of campaign.recipients) {
      const phone = recipient.recipientPhone || recipient.lead?.phone;
      if (!phone) {
        await db.smsCampaignDeal.update({
          where: { id: recipient.id },
          data: { status: "FAILED" },
        });
        failCount++;
        continue;
      }

      const name =
        recipient.recipientName ||
        recipient.lead?.contactPerson ||
        recipient.lead?.businessName ||
        "";
      const firstName = name.split(" ")[0] || "";
      const lastName = name.split(" ").slice(1).join(" ") || "";

      const vars = {
        name,
        firstName,
        lastName,
        contactPerson: name,
        businessName: recipient.lead?.businessName || name,
        company: recipient.lead?.businessName || "",
        email: recipient.lead?.email || "",
      };

      const personalizedMessage = personalizeContent(
        campaign.message || "",
        vars,
      );

      try {
        const result = await sendSMS(phone, personalizedMessage);

        await db.smsCampaignDeal.update({
          where: { id: recipient.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            twilioSid: result?.sid || null,
          },
        });
        sentCount++;
      } catch (err) {
        console.error(`[SMS Campaign] Failed to send to ${phone}:`, err);
        await db.smsCampaignDeal.update({
          where: { id: recipient.id },
          data: { status: "FAILED" },
        });
        failCount++;
      }

      // Rate limit: 50ms between sends
      await new Promise((r) => setTimeout(r, 50));
    }

    const totalSent = (campaign.totalSent || 0) + sentCount;
    await db.smsCampaign.update({
      where: { id: params.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        totalSent,
        totalRecipients:
          (campaign.totalRecipients || 0) + sentCount + failCount,
      },
    });

    emitCRMEvent("campaign_sent", ctx.userId, {
      entityId: params.id,
      entityType: "SmsCampaign",
      data: { sentCount, failCount },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failCount,
      message: `SMS campaign sent: ${sentCount} delivered, ${failCount} failed`,
    });
  } catch (error: unknown) {
    console.error("Error sending SMS campaign:", error);
    return apiErrors.internal("Failed to send campaign");
  }
}
