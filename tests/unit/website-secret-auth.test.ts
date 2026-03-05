import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dal/resolve-website-db", () => ({
  resolveWebsiteDb: vi.fn(),
}));

import { authorizeWebsiteSecret } from "@/lib/website-secret-auth";
import { resolveWebsiteDb } from "@/lib/dal/resolve-website-db";

const mockedResolveWebsiteDb = vi.mocked(resolveWebsiteDb);

describe("website secret auth", () => {
  it("authorizes when dedicated website secret matches", async () => {
    mockedResolveWebsiteDb.mockResolvedValueOnce({
      db: {
        website: {
          findUnique: vi.fn().mockResolvedValue({
            id: "w1",
            userId: "u1",
            websiteSecret: "abc123",
          }),
        },
      } as any,
      industry: null,
    });

    const result = await authorizeWebsiteSecret("w1", "abc123");
    expect(result.ok).toBe(true);
  });

  it("rejects mismatched dedicated website secret", async () => {
    mockedResolveWebsiteDb.mockResolvedValueOnce({
      db: {
        website: {
          findUnique: vi.fn().mockResolvedValue({
            id: "w1",
            userId: "u1",
            websiteSecret: "abc123",
          }),
        },
      } as any,
      industry: null,
    });

    const result = await authorizeWebsiteSecret("w1", "nope");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("falls back to legacy secret in non-production only", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WEBSITE_VOICE_CONFIG_SECRET", "legacy-secret");

    mockedResolveWebsiteDb.mockResolvedValueOnce({
      db: {
        website: {
          findUnique: vi.fn().mockResolvedValue({
            id: "w2",
            userId: "u2",
            websiteSecret: null,
          }),
        },
      } as any,
      industry: null,
    });

    const result = await authorizeWebsiteSecret("w2", "legacy-secret");
    expect(result.ok).toBe(true);
    vi.unstubAllEnvs();
  });
});
