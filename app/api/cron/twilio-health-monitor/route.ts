/**
 * Cron Job: Twilio Health Monitor
 * Runs every 2 minutes to check Twilio account health
 * POST /api/cron/twilio-health-monitor
 *
 * Configure in Vercel Cron Jobs (vercel.json)
 * Schedule: every 2 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { twilioHealthMonitor } from "@/lib/twilio-failover/health-monitor";
import { twilioFailoverService } from "@/lib/twilio-failover/failover-service";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runMonitor(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    console.log("🔍 [Cron] Starting Twilio health monitoring...");

    // Get all active Twilio accounts
    const accounts = await getMetaDb().twilioAccount.findMany({
      where: {
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      console.log("⚠️  [Cron] No active Twilio accounts found");
      return NextResponse.json({ message: "No active accounts" });
    }

    // Check each account
    for (const account of accounts) {
      try {
        console.log(`📊 [Cron] Checking account: ${account.name}`);

        // Run health check
        const healthCheck = await twilioHealthMonitor.runHealthCheck(
          account.id,
        );

        // Detect if failover is needed
        const detection = await twilioHealthMonitor.detectFailoverNeeded(
          account.id,
        );

        if (detection.shouldFailover) {
          console.log(
            `⚠️  [Cron] Failover needed for ${account.name}: ${detection.reason}`,
          );

          // Check if there's already a pending failover event
          const existingEvent = await getMetaDb().twilioFailoverEvent.findFirst(
            {
              where: {
                fromAccountId: account.id,
                status: {
                  in: ["PENDING_APPROVAL", "APPROVED", "EXECUTING"],
                },
              },
            },
          );

          if (!existingEvent) {
            // Start failover process
            await twilioFailoverService.startFailoverProcess(
              account.id,
              detection.triggerType!,
              "AUTO", // System triggered
            );

            console.log(
              `✅ [Cron] Failover process started for ${account.name}`,
            );
          } else {
            console.log(
              `ℹ️  [Cron] Failover already in progress for ${account.name}`,
            );
          }
        } else {
          console.log(`✅ [Cron] Account ${account.name} is healthy`);
        }
      } catch (error: any) {
        console.error(
          `❌ [Cron] Error checking account ${account.name}:`,
          error.message,
        );
        // Continue with other accounts
      }
    }

    return NextResponse.json({
      success: true,
      message: "Health monitoring completed",
      accountsChecked: accounts.length,
    });
  } catch (error: any) {
    console.error("❌ [Cron] Health monitoring error:", error);
    return apiErrors.internal(error.message || "Health monitoring failed");
  }
}

export async function POST(request: NextRequest) {
  return runMonitor(request);
}

export async function GET(request: NextRequest) {
  return runMonitor(request);
}
