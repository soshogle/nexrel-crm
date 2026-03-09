#!/usr/bin/env tsx

import dotenv from "dotenv";
import {
  collectTenantAttestationData,
  writeTenantAttestationFile,
} from "@/lib/tenancy/attestation-report";

const ENV_FILE = process.argv[2] || ".env.local";
const LIMIT = Number(process.argv[3] || "5000");

async function main() {
  dotenv.config({ path: ENV_FILE });

  const data = await collectTenantAttestationData(LIMIT);
  const outputPath = await writeTenantAttestationFile(data);

  console.log("Generated attestation:", outputPath);
  console.log(
    JSON.stringify(
      {
        totalActiveOwners: data.totalActiveOwners,
        dedicatedOwners: data.dedicatedOwners,
        nonDedicatedOwners: data.nonDedicatedOwners,
        coveragePct: data.coveragePct,
        newOwners: data.newOwners,
        newOwnersDedicated: data.newOwnersDedicated,
        exceptions: data.exceptions,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("Failed to generate tenant DB mapping attestation:", error);
  process.exit(1);
});
