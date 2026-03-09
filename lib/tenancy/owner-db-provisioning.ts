import { PrismaClient } from "@prisma/client";
import {
  getTenantOverrideMap,
  setTenantOverrideEnvKey,
} from "@/lib/tenancy/tenant-registry";

const NEON_API_BASE = "https://console.neon.tech/api/v2";

function sanitizeKeyPart(input: string): string {
  return input.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
}

export function tenantDatabaseEnvKey(tenantId: string): string {
  return `DATABASE_URL_TENANT_${sanitizeKeyPart(tenantId)}`;
}

function projectNameFromIdentity(tenantId: string, email: string): string {
  const local = email.split("@")[0] || "owner";
  const base = `${local}-${tenantId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `owner-${base}`.slice(0, 63);
}

export async function createNeonTenantDatabase(params: {
  tenantId: string;
  email: string;
}): Promise<{ projectId: string; databaseUrl: string }> {
  const neonApiKey = process.env.NEON_API_KEY;
  if (!neonApiKey) {
    throw new Error("NEON_API_KEY is required for dedicated DB provisioning");
  }

  const createResponse = await fetch(`${NEON_API_BASE}/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${neonApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project: {
        name: projectNameFromIdentity(params.tenantId, params.email),
      },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(
      `Neon project creation failed: ${await createResponse.text()}`,
    );
  }

  const data = (await createResponse.json()) as {
    project?: { id: string };
    connection_uris?: Array<{ connection_uri: string }>;
    connection_uri?: string;
  };

  const projectId = data.project?.id;
  if (!projectId) {
    throw new Error("Neon API did not return project id");
  }

  const directUri =
    data.connection_uris?.[0]?.connection_uri ?? data.connection_uri;
  if (directUri) {
    return { projectId, databaseUrl: directUri };
  }

  const uriResponse = await fetch(
    `${NEON_API_BASE}/projects/${projectId}/connection_uri`,
    {
      headers: {
        Authorization: `Bearer ${neonApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!uriResponse.ok) {
    throw new Error(
      `Neon connection URI fetch failed: ${await uriResponse.text()}`,
    );
  }

  const uriData = (await uriResponse.json()) as { connection_uri?: string };
  if (!uriData.connection_uri) {
    throw new Error("Neon API did not provide connection URI");
  }

  return { projectId, databaseUrl: uriData.connection_uri };
}

export async function deleteNeonProject(projectId: string): Promise<void> {
  const neonApiKey = process.env.NEON_API_KEY;
  if (!neonApiKey) return;
  await fetch(`${NEON_API_BASE}/projects/${projectId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${neonApiKey}`,
      "Content-Type": "application/json",
    },
  });
}

export async function verifyDatabaseConnection(
  databaseUrl: string,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ["error"],
    });
    try {
      await client.$queryRaw`SELECT 1`;
      await client.$disconnect();
      return;
    } catch (error) {
      lastError = error;
      await client.$disconnect();
      if (attempt < 10) {
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to verify tenant database connection");
}

async function upsertVercelEnvVar(key: string, value: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "VERCEL_TOKEN and VERCEL_PROJECT_ID are required in production",
      );
    }
    return;
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const base = new URL(`https://api.vercel.com/v10/projects/${projectId}/env`);
  if (teamId) base.searchParams.set("teamId", teamId);

  const getRes = await fetch(base.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getRes.ok) {
    throw new Error(`Failed to list Vercel env vars: ${await getRes.text()}`);
  }
  const list = (await getRes.json()) as {
    envs?: Array<{ id: string; key: string; target?: string[] }>;
  };
  const existing = list.envs?.find((env) => env.key === key);

  if (existing?.id) {
    const patchUrl = new URL(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`,
    );
    if (teamId) patchUrl.searchParams.set("teamId", teamId);
    const updateRes = await fetch(patchUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value,
        target: ["production", "preview", "development"],
      }),
    });
    if (!updateRes.ok) {
      throw new Error(
        `Failed to update Vercel env ${key}: ${await updateRes.text()}`,
      );
    }
    return;
  }

  const createRes = await fetch(base.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: ["production", "preview", "development"],
    }),
  });
  if (!createRes.ok) {
    throw new Error(
      `Failed to create Vercel env ${key}: ${await createRes.text()}`,
    );
  }
}

export async function persistTenantOverride(params: {
  tenantId: string;
  databaseEnvKey: string;
  databaseUrl: string;
}): Promise<void> {
  process.env[params.databaseEnvKey] = params.databaseUrl;
  setTenantOverrideEnvKey(params.tenantId, params.databaseEnvKey);

  const updatedOverrides = getTenantOverrideMap();
  const shouldPersistToVercel = Boolean(
    process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID,
  );

  if (process.env.NODE_ENV === "production" && !shouldPersistToVercel) {
    throw new Error(
      "Cannot safely persist tenant override in production without VERCEL_TOKEN and VERCEL_PROJECT_ID",
    );
  }

  if (shouldPersistToVercel) {
    await upsertVercelEnvVar(params.databaseEnvKey, params.databaseUrl);
    await upsertVercelEnvVar(
      "TENANT_DB_OVERRIDES_JSON",
      JSON.stringify(updatedOverrides),
    );
  }
}
