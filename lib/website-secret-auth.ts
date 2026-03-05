import crypto from "crypto";
import { resolveWebsiteDb } from "@/lib/dal/resolve-website-db";

type WebsiteSecretAuthResult =
  | {
      ok: true;
      website: { id: string; userId: string; websiteSecret: string | null };
    }
  | { ok: false; status: 401 | 404 | 500; reason: string };

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export async function authorizeWebsiteSecret(
  websiteId: string,
  providedSecret: string | null,
): Promise<WebsiteSecretAuthResult> {
  const resolved = await resolveWebsiteDb(websiteId);
  if (!resolved) {
    return { ok: false, status: 404, reason: "Website not found" };
  }

  const website = await resolved.db.website.findUnique({
    where: { id: websiteId },
    select: { id: true, userId: true, websiteSecret: true },
  });

  if (!website) {
    return { ok: false, status: 404, reason: "Website not found" };
  }

  if (!providedSecret) {
    return { ok: false, status: 401, reason: "Missing website secret" };
  }

  if (website.websiteSecret) {
    if (!timingSafeEqual(providedSecret, website.websiteSecret)) {
      return { ok: false, status: 401, reason: "Invalid website secret" };
    }
    return { ok: true, website };
  }

  const legacySecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
  if (!legacySecret) {
    return {
      ok: false,
      status: process.env.NODE_ENV === "production" ? 500 : 401,
      reason:
        process.env.NODE_ENV === "production"
          ? "Website secret not configured"
          : "Missing legacy website secret",
    };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 500,
      reason: "Website is missing dedicated websiteSecret",
    };
  }

  if (!timingSafeEqual(providedSecret, legacySecret)) {
    return { ok: false, status: 401, reason: "Invalid website secret" };
  }

  return { ok: true, website };
}
