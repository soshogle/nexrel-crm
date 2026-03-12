type TrustMode = "crawl" | "walk" | "run";

type LeadCandidate = {
  id: string;
  contactPerson: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  website?: string | null;
};

type AdapterContext = {
  db: any;
  userId: string;
  trustMode: TrustMode;
  leads: LeadCandidate[];
  options?: {
    enableExternal?: boolean;
    allowPaidLaunch?: boolean;
    allowAds?: boolean;
    allowSocialPublish?: boolean;
    apolloQuery?: string;
    socialMessage?: string;
  };
};

type AdapterResult = {
  integration: string;
  status: "executed" | "skipped" | "error";
  detail: string;
  payload?: any;
};

async function getApiKeyMap(db: any, userId: string) {
  const keys = await db.apiKey.findMany({
    where: { userId, isActive: true },
    select: { service: true, keyName: true, keyValue: true },
  });

  const map = new Map<string, string>();
  for (const key of keys) {
    const service = String(key.service || "").toLowerCase();
    const keyName = String(key.keyName || "").toLowerCase();
    if (service && key.keyValue) {
      map.set(service, key.keyValue);
      if (keyName) map.set(`${service}:${keyName}`, key.keyValue);
    }
  }
  return map;
}

async function runApolloDiscovery(
  ctx: AdapterContext,
  keyMap: Map<string, string>,
): Promise<AdapterResult> {
  const apiKey = keyMap.get("apollo") || keyMap.get("apollo:api_key");
  if (!apiKey) {
    return {
      integration: "apollo",
      status: "skipped",
      detail: "Apollo API key is not configured.",
    };
  }

  try {
    const query =
      ctx.options?.apolloQuery ||
      "owner OR founder OR manager AND (marketing OR sales)";
    const response = await fetch(
      "https://api.apollo.io/v1/mixed_people/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          q_keywords: query,
          page: 1,
          per_page: 5,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        integration: "apollo",
        status: "error",
        detail: `Apollo request failed (${response.status})`,
        payload: text,
      };
    }

    const data = await response.json();
    const people = Array.isArray(data?.people) ? data.people : [];
    let imported = 0;

    for (const person of people) {
      const fullName =
        String(person?.name || "").trim() ||
        `${person?.first_name || ""} ${person?.last_name || ""}`.trim();
      const email = person?.email || null;
      const company = person?.organization?.name || null;
      const phone = person?.phone_numbers?.[0]?.sanitized_number || null;
      if (!fullName) continue;

      const exists = await ctx.db.lead.findFirst({
        where: {
          userId: ctx.userId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
            { contactPerson: fullName },
          ],
        },
        select: { id: true },
      });

      if (exists) continue;

      await ctx.db.lead.create({
        data: {
          userId: ctx.userId,
          contactPerson: fullName,
          businessName: company || fullName,
          email,
          phone,
          source: "Apollo",
          status: "NEW",
        },
      });
      imported += 1;
    }

    return {
      integration: "apollo",
      status: "executed",
      detail: `Imported ${imported} leads from Apollo discovery.`,
      payload: { found: people.length, imported },
    };
  } catch (error: any) {
    return {
      integration: "apollo",
      status: "error",
      detail: "Apollo integration threw an exception.",
      payload: error?.message || String(error),
    };
  }
}

async function runHunterEnrichment(
  ctx: AdapterContext,
  keyMap: Map<string, string>,
): Promise<AdapterResult> {
  const apiKey =
    keyMap.get("hunter") ||
    keyMap.get("hunter.io") ||
    keyMap.get("hunter:api_key") ||
    keyMap.get("hunter.io:api_key");

  if (!apiKey) {
    return {
      integration: "hunter",
      status: "skipped",
      detail: "Hunter API key is not configured.",
    };
  }

  try {
    const targets = ctx.leads.filter(
      (lead) => !lead.email && lead.businessName && lead.contactPerson,
    );

    let enriched = 0;
    for (const lead of targets.slice(0, 5)) {
      const domainGuess =
        String(lead.website || "")
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, "") ||
        `${String(lead.businessName).toLowerCase().replace(/\s+/g, "")}.com`;

      const finderUrl = new URL("https://api.hunter.io/v2/email-finder");
      finderUrl.searchParams.set("domain", domainGuess);
      finderUrl.searchParams.set("full_name", String(lead.contactPerson));
      finderUrl.searchParams.set("api_key", apiKey);

      const response = await fetch(finderUrl.toString());
      if (!response.ok) continue;
      const payload = await response.json();
      const email = payload?.data?.email;
      if (!email) continue;

      await ctx.db.lead.update({
        where: { id: lead.id },
        data: { email, lastEnrichedAt: new Date(), source: "Hunter.io" },
      });
      enriched += 1;
    }

    return {
      integration: "hunter",
      status: "executed",
      detail: `Enriched ${enriched} leads with Hunter email finder.`,
      payload: { attempted: targets.length, enriched },
    };
  } catch (error: any) {
    return {
      integration: "hunter",
      status: "error",
      detail: "Hunter integration threw an exception.",
      payload: error?.message || String(error),
    };
  }
}

async function runMetaAdsLaunch(
  ctx: AdapterContext,
  keyMap: Map<string, string>,
): Promise<AdapterResult> {
  const token =
    keyMap.get("meta") ||
    keyMap.get("facebook_ads") ||
    keyMap.get("meta:access_token") ||
    keyMap.get("facebook_ads:access_token");
  const accountId =
    keyMap.get("meta:account_id") || keyMap.get("facebook_ads:account_id");

  if (!token || !accountId) {
    return {
      integration: "meta_ads",
      status: "skipped",
      detail: "Meta Ads token/account id is not configured.",
    };
  }

  if (ctx.trustMode === "crawl") {
    return {
      integration: "meta_ads",
      status: "skipped",
      detail: "Crawl mode prevents paid campaign creation.",
    };
  }

  if (ctx.options?.allowAds === false) {
    return {
      integration: "meta_ads",
      status: "skipped",
      detail: "Owner control disabled ads channel.",
    };
  }

  try {
    const status =
      ctx.trustMode === "run" && ctx.options?.allowPaidLaunch
        ? "ACTIVE"
        : "PAUSED";
    const campaignName = `NexRel Auto Campaign ${new Date().toISOString().slice(0, 10)}`;

    const params = new URLSearchParams();
    params.set("name", campaignName);
    params.set("objective", "OUTCOME_LEADS");
    params.set("status", status);
    params.set("special_ad_categories", "[]");
    params.set("access_token", token);

    const response = await fetch(
      `https://graph.facebook.com/v21.0/act_${accountId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.error) {
      return {
        integration: "meta_ads",
        status: "error",
        detail: "Meta Ads campaign creation failed.",
        payload,
      };
    }

    return {
      integration: "meta_ads",
      status: "executed",
      detail: `Meta campaign created with status ${status}.`,
      payload,
    };
  } catch (error: any) {
    return {
      integration: "meta_ads",
      status: "error",
      detail: "Meta Ads integration threw an exception.",
      payload: error?.message || String(error),
    };
  }
}

async function runSocialPublish(
  ctx: AdapterContext,
  keyMap: Map<string, string>,
): Promise<AdapterResult> {
  const linkedInToken =
    keyMap.get("linkedin") || keyMap.get("linkedin:access_token");
  const linkedInAuthor =
    keyMap.get("linkedin:author_urn") || keyMap.get("linkedin:person_urn");

  if (!linkedInToken || !linkedInAuthor) {
    return {
      integration: "social_publish",
      status: "skipped",
      detail: "LinkedIn publish credentials are not configured.",
    };
  }

  if (ctx.trustMode === "crawl") {
    return {
      integration: "social_publish",
      status: "skipped",
      detail: "Crawl mode keeps social actions in draft mode.",
    };
  }

  if (ctx.options?.allowSocialPublish === false) {
    return {
      integration: "social_publish",
      status: "skipped",
      detail: "Owner control disabled social publishing channel.",
    };
  }

  try {
    const text =
      ctx.options?.socialMessage ||
      "Daily ops insight: our autonomous agents are improving lead response time and qualification quality across channels.";

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${linkedInToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: linkedInAuthor,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const payloadText = await response.text();
    if (!response.ok) {
      return {
        integration: "social_publish",
        status: "error",
        detail: `LinkedIn publish failed (${response.status}).`,
        payload: payloadText,
      };
    }

    return {
      integration: "social_publish",
      status: "executed",
      detail: "Published autonomous update to LinkedIn.",
      payload: payloadText,
    };
  } catch (error: any) {
    return {
      integration: "social_publish",
      status: "error",
      detail: "Social publish integration threw an exception.",
      payload: error?.message || String(error),
    };
  }
}

export async function runExternalAdapters(ctx: AdapterContext) {
  if (!ctx.options?.enableExternal) {
    return {
      enabled: false,
      results: [] as AdapterResult[],
    };
  }

  const keyMap = await getApiKeyMap(ctx.db, ctx.userId);
  const results = await Promise.all([
    runApolloDiscovery(ctx, keyMap),
    runHunterEnrichment(ctx, keyMap),
    runMetaAdsLaunch(ctx, keyMap),
    runSocialPublish(ctx, keyMap),
  ]);

  return {
    enabled: true,
    results,
  };
}
