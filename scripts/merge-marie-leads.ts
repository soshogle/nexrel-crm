/**
 * Merge duplicate Marie Tremblay leads for orthodontist@nexrel.com into one lead.
 *
 * Usage:
 *   npx tsx scripts/merge-marie-leads.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "orthodontist@nexrel.com" },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("orthodontist@nexrel.com not found");
  }

  const marieLeads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      OR: [
        { contactPerson: { contains: "Marie", mode: "insensitive" } },
        { businessName: { contains: "Marie", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      contactPerson: true,
      businessName: true,
      source: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  if (marieLeads.length === 0) {
    console.log("No Marie-like leads found; nothing to merge.");
    return;
  }

  const keepLead =
    marieLeads.find((l) => l.source === "mock_data") ?? marieLeads[0];
  const duplicateIds = marieLeads
    .filter((l) => l.id !== keepLead.id)
    .map((l) => l.id);

  console.log(
    `Keeping lead: ${keepLead.id} (${keepLead.contactPerson ?? "n/a"})`,
  );
  console.log(`Duplicate leads to merge: ${duplicateIds.length}`);

  if (duplicateIds.length === 0) {
    console.log("Already a single Marie lead.");
    return;
  }

  const tables = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'leadId'
        AND table_name <> 'Lead'
    `,
  );

  const duplicateList = duplicateIds
    .map((id) => `'${id.replace(/'/g, "''")}'`)
    .join(",");
  const targetLeadId = keepLead.id.replace(/'/g, "''");

  let movedRows = 0;
  for (const { table_name } of tables) {
    const sql = `UPDATE ${quoteIdentifier(table_name)} SET "leadId"='${targetLeadId}' WHERE "leadId" IN (${duplicateList})`;
    try {
      const count = await prisma.$executeRawUnsafe(sql);
      if (count > 0) {
        movedRows += Number(count);
        console.log(`  ${table_name}: moved ${count}`);
      }
    } catch (error: any) {
      console.log(`  ${table_name}: skipped (${error?.code ?? "error"})`);
    }
  }

  const deleted = await prisma.lead.deleteMany({
    where: { id: { in: duplicateIds } },
  });

  await prisma.lead.update({
    where: { id: keepLead.id },
    data: {
      contactPerson: "Marie Tremblay",
      businessName: "Marie Tremblay",
      source: "mock_data",
      tags: ["MOCK_DATA"],
    },
  });

  const finalMarieLeads = await prisma.lead.findMany({
    where: {
      userId: user.id,
      OR: [
        { contactPerson: { contains: "Marie", mode: "insensitive" } },
        { businessName: { contains: "Marie", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      contactPerson: true,
      businessName: true,
      source: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const xrayCount = await prisma.dentalXRay.count({
    where: { leadId: keepLead.id, userId: user.id },
  });
  const xrayDocCount = await prisma.patientDocument.count({
    where: { leadId: keepLead.id, userId: user.id, documentType: "XRAY" },
  });

  console.log("\nDone.");
  console.log(`Moved rows across lead-linked tables: ${movedRows}`);
  console.log(`Deleted duplicate leads: ${deleted.count}`);
  console.log(`Remaining Marie leads: ${finalMarieLeads.length}`);
  console.log(`Canonical Marie X-rays: ${xrayCount}`);
  console.log(`Canonical Marie X-ray documents: ${xrayDocCount}`);
  console.log(JSON.stringify(finalMarieLeads, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to merge Marie leads:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
