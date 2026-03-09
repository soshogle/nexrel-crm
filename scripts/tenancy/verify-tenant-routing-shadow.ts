#!/usr/bin/env tsx

import dotenv from "dotenv";
import { listTenantRoutingCoverage } from "@/lib/tenancy/tenant-registry";

const ENV_FILE = process.argv[2] || ".env.local";

async function main() {
  dotenv.config({ path: ENV_FILE });

  const coverage = await listTenantRoutingCoverage(2000);
  const configuredRatio = coverage.totalUsers
    ? coverage.withConfiguredDbUrl / coverage.totalUsers
    : 0;

  console.log("Tenant routing shadow coverage");
  console.log("- env file:", ENV_FILE);
  console.log("- total users sampled:", coverage.totalUsers);
  console.log("- users with configured DB URL:", coverage.withConfiguredDbUrl);
  console.log("- configured ratio:", configuredRatio.toFixed(4));
  console.log("- routing modes:", JSON.stringify(coverage.byMode, null, 2));

  if (coverage.totalUsers === 0) {
    console.warn("No users found; cannot validate routing coverage.");
    return;
  }

  if (configuredRatio < 1) {
    console.warn(
      "WARNING: Some tenants currently resolve to missing or unset DB URLs. Keep this in shadow mode until resolved.",
    );
  } else {
    console.log("OK: All sampled tenants resolve to configured DB URLs.");
  }
}

main().catch((error) => {
  console.error("Tenant routing shadow verification failed:", error);
  process.exit(1);
});
