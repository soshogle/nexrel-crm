import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ingestNativeSocialDiagnostics,
  publishViralDraftsToNativeChannels,
} from "@/lib/social-native";

describe("social native adapters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates facebook unpublished draft posts", async () => {
    const db = {
      channelConnection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "conn-fb",
            channelType: "FACEBOOK_MESSENGER",
            channelIdentifier: "page-1",
            providerAccountId: null,
            accessToken: "token",
            displayName: "Page",
            providerData: {},
          },
        ]),
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "post-1" }),
      }),
    );

    const result = await publishViralDraftsToNativeChannels({
      db,
      userId: "u1",
      caption: "Hello world",
    });

    expect(result.created).toBe(1);
    expect(result.results[0].status).toBe("created");
    expect(result.results[0].draftId).toBe("post-1");
  });

  it("requires media url for instagram draft container", async () => {
    const db = {
      channelConnection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "conn-ig",
            channelType: "INSTAGRAM",
            channelIdentifier: "ig-1",
            providerAccountId: null,
            accessToken: "token",
            displayName: "IG",
            providerData: {},
          },
        ]),
      },
    };

    const result = await publishViralDraftsToNativeChannels({
      db,
      userId: "u1",
      caption: "Caption",
    });

    expect(result.created).toBe(0);
    expect(result.results[0].status).toBe("failed");
    expect(result.results[0].message).toContain("mediaUrl");
  });

  it("ingests native facebook diagnostics metrics", async () => {
    const db = {
      channelConnection: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "conn-fb",
            channelType: "FACEBOOK_MESSENGER",
            channelIdentifier: "page-1",
            providerAccountId: null,
            accessToken: "token",
            displayName: "Page",
            providerData: {},
          },
        ]),
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: "post-1",
              message: "Hook line\nCTA line",
              created_time: "2026-03-11T00:00:00.000Z",
              insights: {
                data: [
                  { name: "post_impressions", values: [{ value: 1000 }] },
                  { name: "post_clicks", values: [{ value: 40 }] },
                  { name: "post_engaged_users", values: [{ value: 50 }] },
                ],
              },
            },
          ],
        }),
      }),
    );

    const result = await ingestNativeSocialDiagnostics({
      db,
      userId: "u1",
      limitPerChannel: 5,
    });

    expect(result.posts.length).toBe(1);
    expect(result.posts[0].views).toBe(1000);
    expect(result.posts[0].conversions).toBe(50);
    expect(result.posts[0].hook).toBe("Hook line");
  });
});
