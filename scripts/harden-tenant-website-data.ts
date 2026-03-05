#!/usr/bin/env tsx

import crypto from "crypto";
import { prisma } from "@/lib/db";

function newSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function main() {
  console.log("Starting tenant hardening pass...\n");

  const missingSecrets = await prisma.website.findMany({
    where: { websiteSecret: null },
    select: { id: true, name: true, userId: true },
  });

  if (missingSecrets.length > 0) {
    console.log(
      `Backfilling websiteSecret for ${missingSecrets.length} website(s)...`,
    );
    for (const website of missingSecrets) {
      await prisma.website.update({
        where: { id: website.id },
        data: { websiteSecret: newSecret() },
      });
    }
  } else {
    console.log("No websites missing websiteSecret.");
  }

  const suspiciousDarkswordLinks = await prisma.website.findMany({
    where: {
      OR: [
        {
          vercelDeploymentUrl: {
            contains: "darksword-armory",
            mode: "insensitive",
          },
        },
        {
          githubRepoUrl: { contains: "darksword-armory", mode: "insensitive" },
        },
      ],
      NOT: {
        user: {
          email: { equals: "eyal@darksword-armory.com", mode: "insensitive" },
        },
      },
    },
    include: { user: { select: { email: true } } },
  });

  if (suspiciousDarkswordLinks.length > 0) {
    console.log(
      `\nFound ${suspiciousDarkswordLinks.length} cross-owner Darksword linkage row(s). Cleaning...`,
    );
    for (const website of suspiciousDarkswordLinks) {
      await prisma.website.update({
        where: { id: website.id },
        data: {
          vercelDeploymentUrl: null,
          vercelProjectId: null,
          githubRepoUrl: null,
        },
      });
      console.log(
        `- cleaned ${website.id} (${website.name}) owner=${website.user?.email}`,
      );
    }
  } else {
    console.log("\nNo cross-owner Darksword linkage rows found.");
  }

  const duplicateSecrets = await prisma.website.groupBy({
    by: ["websiteSecret"],
    where: { websiteSecret: { not: null } },
    _count: { _all: true },
    having: { websiteSecret: { _count: { gt: 1 } } } as any,
  });

  if (duplicateSecrets.length > 0) {
    console.log(
      `\nResolving ${duplicateSecrets.length} duplicated websiteSecret value(s)...`,
    );
    for (const dup of duplicateSecrets) {
      const websites = await prisma.website.findMany({
        where: { websiteSecret: dup.websiteSecret as string },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      for (let i = 1; i < websites.length; i++) {
        await prisma.website.update({
          where: { id: websites[i].id },
          data: { websiteSecret: newSecret() },
        });
      }
    }
  } else {
    console.log("No duplicate website secrets detected.");
  }

  console.log("\nTenant hardening pass completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
