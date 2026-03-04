#!/usr/bin/env tsx
/**
 * Set Theodora's Realtor.ca agent URL and Centris broker URL in her Website agencyConfig.
 * Run: npx tsx scripts/set-theodora-realtor-url.ts
 *
 * Enables both Realtor.ca and Centris.ca sync to fetch her listings and mark them featured.
 */

import { prisma } from "../lib/db";

const THEODORA_REALTOR_URL =
  "https://www.realtor.ca/agent/2237157/theodora-stavropoulos-9280-boul-de-lacadie-montreal-quebec-h4n3c5";

const THEODORA_CENTRIS_URL =
  "https://www.centris.ca/en/real-estate-broker~theodora-stavropoulos~re-max-3000-inc./j4672";

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

  const ac = (website.agencyConfig as Record<string, unknown> | null) ?? {};
  const currentRealtor = ac.realtorBrokerUrl as string | undefined;
  const currentCentris = ac.centrisBrokerUrl as string | undefined;

  if (currentRealtor === THEODORA_REALTOR_URL && currentCentris === THEODORA_CENTRIS_URL) {
    console.log("Realtor and Centris URLs already set.");
    return;
  }

  const agencyConfig = {
    ...(typeof website.agencyConfig === "object" && website.agencyConfig
      ? (website.agencyConfig as Record<string, unknown>)
      : {}),
    realtorBrokerUrl: THEODORA_REALTOR_URL,
    centrisBrokerUrl: THEODORA_CENTRIS_URL,
  };

  await prisma.website.update({
    where: { id: website.id },
    data: { agencyConfig },
  });

  console.log(`Set agencyConfig for "${website.name}" (${website.id})`);
  console.log(`  realtorBrokerUrl: ${THEODORA_REALTOR_URL}`);
  console.log(`  centrisBrokerUrl: ${THEODORA_CENTRIS_URL}`);
  console.log("\nNext: Run Sync (npx tsx scripts/run-theodora-full-sync.ts) or trigger cron.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
