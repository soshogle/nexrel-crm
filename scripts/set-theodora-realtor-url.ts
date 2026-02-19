#!/usr/bin/env tsx
/**
 * Set Theodora's Realtor.ca agent URL in her Website agencyConfig.
 * Run: npx tsx scripts/set-theodora-realtor-url.ts
 *
 * This enables the Realtor.ca sync to fetch her listings and add them to her DB.
 */

import { prisma } from "../lib/db";

const THEODORA_REALTOR_URL =
  "https://www.realtor.ca/agent/2237157/theodora-stavropoulos-9280-boul-de-lacadie-montreal-quebec-h4n3c5";

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website = theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];

  if (!website) {
    console.error("Theodora's website not found. Run create-theodora-website.ts first.");
    process.exit(1);
  }

  const current = (website.agencyConfig as Record<string, unknown> | null)?.realtorBrokerUrl;
  if (current === THEODORA_REALTOR_URL) {
    console.log("Realtor URL already set.");
    return;
  }

  const agencyConfig = {
    ...(typeof website.agencyConfig === "object" && website.agencyConfig
      ? (website.agencyConfig as Record<string, unknown>)
      : {}),
    realtorBrokerUrl: THEODORA_REALTOR_URL,
  };

  await prisma.website.update({
    where: { id: website.id },
    data: { agencyConfig },
  });

  console.log(`Set realtorBrokerUrl for "${website.name}" (${website.id})`);
  console.log(`URL: ${THEODORA_REALTOR_URL}`);
  console.log("\nNext: Run Sync in the dashboard or trigger cron to fetch her Realtor.ca listings.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
