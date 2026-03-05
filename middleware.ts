/**
 * Next.js Middleware for Security Headers, Rate Limiting, and Subdomain Routing
 * Runs on all requests before they reach the API routes
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

// Extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  const parts = hostname.split(".");

  // For localhost or single-part domains, no subdomain
  if (parts.length <= 2 || hostname.includes("localhost")) {
    return null;
  }

  // For domains like spikes.soshogle.com
  // parts = ['spikes', 'soshogle', 'com']
  const subdomain = parts[0];

  // Ignore reserved subdomains
  const reserved = ["www", "app", "api", "admin", "cdn", "static"];
  if (reserved.includes(subdomain.toLowerCase())) {
    return null;
  }

  return subdomain;
}

function applyHeaders(
  request: NextRequest,
  response: NextResponse,
  nonce: string,
): NextResponse {
  const securityHeaders: Record<string, string> = {
    "Content-Security-Policy": [
      "default-src 'self'",
      // nonce replaces 'unsafe-inline' — inline scripts must carry this nonce attribute
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' blob: https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://static.cloudflareinsights.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // removed http: from img-src (audit finding)
      "img-src 'self' data: blob: https: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://*.googleapis.com https://api.elevenlabs.io wss://api.elevenlabs.io https://livekit.rtc.elevenlabs.io wss://livekit.rtc.elevenlabs.io https://api.twilio.com https://api.stripe.com https://api.square.com https://api.paypal.com https://*.abacusai.app wss://*.abacusai.app https://cloudflareinsights.com https://*.cloudflareinsights.com",
      "frame-src 'self' blob: https: https://accounts.google.com https://www.paypal.com https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://vercel.com https://*.vercel.app https://*.soshogle.com https://calendly.com https://*.calendly.com https://www.youtube.com https://*.youtube.com https://youtube.com https://player.vimeo.com https://*.vimeo.com https://*.elevenlabs.io https://elevenlabs.io https://*.vapi.ai https://vapi.ai https://search.google.com https://www.zebracat.ai https://www.clay.com https://www.starcloud.com https://www.neoculturalcouture.com https://www.little-lagniappe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(self), microphone=(self), geolocation=(self), payment=(self)",
  };

  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups",
  );

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  // Expose nonce to layout.tsx via response header
  response.headers.set("x-nonce", nonce);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    if (request.nextUrl.pathname === "/api/elevenlabs/signed-url") {
      // Lock to known origin instead of wildcard
      const origin = process.env.NEXTAUTH_URL || "https://app.soshogle.com";
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
  }

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  return response;
}

export async function middleware(request: NextRequest) {
  // Generate a unique per-request nonce for CSP
  const nonce = btoa(globalThis.crypto.randomUUID());
  const hostname = request.headers.get("host") || "";
  const subdomain = getSubdomain(hostname);

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Use the rightmost IP in x-forwarded-for (set by the last trusted proxy — Vercel's edge).
    // The leftmost IP is client-supplied and can be spoofed; we fall back to x-real-ip then loopback.
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip =
      (forwardedFor ? forwardedFor.split(",").at(-1)?.trim() : null) ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1";

    const isAuthPath = request.nextUrl.pathname.startsWith("/api/auth");
    const isWebhookPath =
      request.nextUrl.pathname.startsWith("/api/webhooks") ||
      request.nextUrl.pathname.includes("webhook");
    const isPublicPath =
      request.nextUrl.pathname.startsWith("/api/widget") ||
      request.nextUrl.pathname.startsWith("/api/appointments/public") ||
      request.nextUrl.pathname.startsWith("/api/booking/");
    const isDentalPath = request.nextUrl.pathname.startsWith("/api/dental");

    const config = isAuthPath
      ? RATE_LIMITS.auth
      : isWebhookPath
        ? RATE_LIMITS.webhook
        : isPublicPath
          ? RATE_LIMITS.public
          : isDentalPath
            ? RATE_LIMITS.apiHeavy
            : RATE_LIMITS.api;

    // For authenticated routes, key on userId to prevent IP-rotation bypass.
    // Auth path keys on IP only — user hasn't authenticated yet.
    const token =
      !isAuthPath && !isPublicPath && !isWebhookPath
        ? await getToken({ req: request }).catch(() => null)
        : null;
    const userId = token?.sub ?? undefined;

    const rlKey = getRateLimitKey(
      ip,
      isAuthPath ? "/api/auth" : request.nextUrl.pathname,
      userId,
    );
    const { allowed, remaining, resetMs } = await checkRateLimit(rlKey, config);

    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(resetMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(remaining));

    if (subdomain) {
      response.headers.set("x-tenant-subdomain", subdomain);
      response.cookies.set("tenant-subdomain", subdomain, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
      });
    }

    return applyHeaders(request, response, nonce);
  }

  const response = NextResponse.next();

  // Add subdomain to request headers if present
  if (subdomain) {
    response.headers.set("x-tenant-subdomain", subdomain);
    response.cookies.set("tenant-subdomain", subdomain, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  return applyHeaders(request, response, nonce);
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
