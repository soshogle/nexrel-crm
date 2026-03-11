type ChannelRow = {
  id: string;
  channelType: "INSTAGRAM" | "FACEBOOK_MESSENGER" | "WHATSAPP";
  channelIdentifier: string | null;
  providerAccountId: string | null;
  accessToken: string | null;
  displayName: string | null;
  providerData: any;
};

export type NativeDraftResult = {
  channelType: ChannelRow["channelType"];
  channelConnectionId: string;
  status: "created" | "failed";
  draftId: string | null;
  message: string;
  raw?: any;
};

export type IngestedSocialPost = {
  id: string;
  channelType: ChannelRow["channelType"];
  hook: string;
  cta: string;
  views: number;
  conversions: number;
  timestamp?: string;
};

function pickHookAndCta(caption: string) {
  const lines = String(caption || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hook = lines[0] || "Untitled social post";
  const cta = lines.at(-1) || "Learn more";
  return { hook, cta };
}

export async function publishViralDraftsToNativeChannels(input: {
  db: any;
  userId: string;
  caption: string;
  mediaUrl?: string;
}) {
  const rows = (await input.db.channelConnection.findMany({
    where: {
      userId: input.userId,
      status: "CONNECTED",
      isActive: true,
      channelType: { in: ["INSTAGRAM", "FACEBOOK_MESSENGER"] },
    },
    select: {
      id: true,
      channelType: true,
      channelIdentifier: true,
      providerAccountId: true,
      accessToken: true,
      displayName: true,
      providerData: true,
    },
  })) as ChannelRow[];

  const results: NativeDraftResult[] = [];

  for (const row of rows) {
    if (!row.accessToken) {
      results.push({
        channelType: row.channelType,
        channelConnectionId: row.id,
        status: "failed",
        draftId: null,
        message: "Missing access token for channel connection",
      });
      continue;
    }

    if (row.channelType === "FACEBOOK_MESSENGER") {
      const pageId = row.channelIdentifier || row.providerAccountId;
      if (!pageId) {
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "failed",
          draftId: null,
          message: "Missing Facebook page id",
        });
        continue;
      }

      try {
        const payload = new URLSearchParams({
          message: input.caption,
          published: "false",
          access_token: row.accessToken,
        });
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString(),
          },
        );
        const data = await response.json();
        if (!response.ok || !data?.id) {
          throw new Error(
            data?.error?.message || "Failed to create draft post",
          );
        }
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "created",
          draftId: String(data.id),
          message: "Facebook unpublished post created",
          raw: data,
        });
      } catch (error: any) {
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "failed",
          draftId: null,
          message: String(error?.message || "Facebook draft creation failed"),
        });
      }
      continue;
    }

    if (row.channelType === "INSTAGRAM") {
      const igAccountId =
        row.channelIdentifier || row.providerData?.igAccountId || null;
      if (!igAccountId) {
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "failed",
          draftId: null,
          message: "Missing Instagram business account id",
        });
        continue;
      }

      if (!input.mediaUrl) {
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "failed",
          draftId: null,
          message:
            "Instagram draft creation needs mediaUrl. Provide a publicly accessible media URL.",
        });
        continue;
      }

      try {
        const payload = new URLSearchParams({
          image_url: input.mediaUrl,
          caption: input.caption,
          access_token: row.accessToken,
        });
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${igAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: payload.toString(),
          },
        );
        const data = await response.json();
        if (!response.ok || !data?.id) {
          throw new Error(
            data?.error?.message ||
              "Failed to create Instagram media container",
          );
        }
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "created",
          draftId: String(data.id),
          message: "Instagram media container created for manual publish",
          raw: data,
        });
      } catch (error: any) {
        results.push({
          channelType: row.channelType,
          channelConnectionId: row.id,
          status: "failed",
          draftId: null,
          message: String(error?.message || "Instagram draft creation failed"),
        });
      }
    }
  }

  return {
    attempted: rows.length,
    created: results.filter((r) => r.status === "created").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  };
}

export async function ingestNativeSocialDiagnostics(input: {
  db: any;
  userId: string;
  limitPerChannel?: number;
}) {
  const limit = Math.max(1, Math.min(25, Number(input.limitPerChannel || 5)));
  const rows = (await input.db.channelConnection.findMany({
    where: {
      userId: input.userId,
      status: "CONNECTED",
      isActive: true,
      channelType: { in: ["INSTAGRAM", "FACEBOOK_MESSENGER"] },
    },
    select: {
      id: true,
      channelType: true,
      channelIdentifier: true,
      providerAccountId: true,
      accessToken: true,
      displayName: true,
      providerData: true,
    },
  })) as ChannelRow[];

  const posts: IngestedSocialPost[] = [];
  const failures: Array<{ channelConnectionId: string; message: string }> = [];

  for (const row of rows) {
    if (!row.accessToken) {
      failures.push({
        channelConnectionId: row.id,
        message: "Missing access token",
      });
      continue;
    }

    if (row.channelType === "FACEBOOK_MESSENGER") {
      const pageId = row.channelIdentifier || row.providerAccountId;
      if (!pageId) {
        failures.push({
          channelConnectionId: row.id,
          message: "Missing Facebook page id",
        });
        continue;
      }

      try {
        const feedRes = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,insights.metric(post_impressions,post_clicks,post_engaged_users)&limit=${limit}&access_token=${encodeURIComponent(row.accessToken)}`,
        );
        const feedJson = await feedRes.json();
        if (!feedRes.ok) {
          throw new Error(
            feedJson?.error?.message || "Facebook feed fetch failed",
          );
        }
        const data = Array.isArray(feedJson?.data) ? feedJson.data : [];
        for (const post of data) {
          const metrics = Array.isArray(post?.insights?.data)
            ? post.insights.data
            : [];
          const impressions =
            Number(
              metrics.find((m: any) => m.name === "post_impressions")
                ?.values?.[0]?.value,
            ) || 0;
          const clicks =
            Number(
              metrics.find((m: any) => m.name === "post_clicks")?.values?.[0]
                ?.value,
            ) || 0;
          const engaged =
            Number(
              metrics.find((m: any) => m.name === "post_engaged_users")
                ?.values?.[0]?.value,
            ) || 0;
          const message = String(post?.message || "Untitled Facebook post");
          const parsed = pickHookAndCta(message);
          posts.push({
            id: String(post.id),
            channelType: row.channelType,
            hook: parsed.hook,
            cta: parsed.cta,
            views: impressions,
            conversions: Math.max(clicks, engaged),
            timestamp: post?.created_time || undefined,
          });
        }
      } catch (error: any) {
        failures.push({
          channelConnectionId: row.id,
          message: String(
            error?.message || "Facebook diagnostics fetch failed",
          ),
        });
      }
      continue;
    }

    if (row.channelType === "INSTAGRAM") {
      const igAccountId =
        row.channelIdentifier || row.providerData?.igAccountId || null;
      if (!igAccountId) {
        failures.push({
          channelConnectionId: row.id,
          message: "Missing Instagram business account id",
        });
        continue;
      }

      try {
        const mediaRes = await fetch(
          `https://graph.facebook.com/v18.0/${igAccountId}/media?fields=id,caption,timestamp,insights.metric(impressions,reach,saved)&limit=${limit}&access_token=${encodeURIComponent(row.accessToken)}`,
        );
        const mediaJson = await mediaRes.json();
        if (!mediaRes.ok) {
          throw new Error(
            mediaJson?.error?.message || "Instagram media fetch failed",
          );
        }
        const data = Array.isArray(mediaJson?.data) ? mediaJson.data : [];
        for (const media of data) {
          const metrics = Array.isArray(media?.insights?.data)
            ? media.insights.data
            : [];
          const impressions =
            Number(
              metrics.find((m: any) => m.name === "impressions")?.values?.[0]
                ?.value,
            ) ||
            Number(
              metrics.find((m: any) => m.name === "reach")?.values?.[0]?.value,
            ) ||
            0;
          const saved =
            Number(
              metrics.find((m: any) => m.name === "saved")?.values?.[0]?.value,
            ) || 0;
          const caption = String(media?.caption || "Untitled Instagram post");
          const parsed = pickHookAndCta(caption);
          posts.push({
            id: String(media.id),
            channelType: row.channelType,
            hook: parsed.hook,
            cta: parsed.cta,
            views: impressions,
            conversions: saved,
            timestamp: media?.timestamp || undefined,
          });
        }
      } catch (error: any) {
        failures.push({
          channelConnectionId: row.id,
          message: String(
            error?.message || "Instagram diagnostics fetch failed",
          ),
        });
      }
    }
  }

  return {
    posts,
    failures,
    inspectedChannels: rows.length,
  };
}
