#!/usr/bin/env tsx
/**
 * Set vercelDeploymentUrl for Eyal's Darksword Armory website.
 * Run: npx tsx scripts/set-darksword-armory-vercel-url.ts
 */
import { prisma } from "@/lib/db";
import { getWebsiteForOwnerOrThrow } from "./utils/website-owner-guard";

const DARKSWORD_ARMORY_VERCEL_URL = "https://darksword-armory.vercel.app";

async function main() {
  const website = await getWebsiteForOwnerOrThrow({
    ownerEmail: "eyal@darksword-armory.com",
    nameContains: "darksword",
  });

  await prisma.website.update({
    where: { id: website.id },
    data: { vercelDeploymentUrl: DARKSWORD_ARMORY_VERCEL_URL },
  });

  console.log("\n✅ Updated vercelDeploymentUrl for Darksword Armory");
  console.log("   Website:", website.name);
  console.log("   ID:", website.id);
  console.log("   Owner:", website.user?.email);
  console.log("   URL:", DARKSWORD_ARMORY_VERCEL_URL);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
