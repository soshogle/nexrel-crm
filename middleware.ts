/**
 * Next.js Middleware for Security Headers, Rate Limiting, and Subdomain Routing
 * Runs on all requests before they reach the API routes
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  const host = request.nextUrl.hostname;
  const isDev =
    process.env.NODE_ENV !== "production" ||
    host === "localhost" ||
    host === "127.0.0.1";

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "blob:",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://maps.googleapis.com",
    "https://static.cloudflareinsights.com",
  ];

  const connectSrc = [
    "'self'",
    "https://accounts.google.com",
    "https://apis.google.com",
    "https://maps.googleapis.com",
    "https://*.googleapis.com",
    "https://api.elevenlabs.io",
    "wss://api.elevenlabs.io",
    "https://livekit.rtc.elevenlabs.io",
    "wss://livekit.rtc.elevenlabs.io",
    "https://api.twilio.com",
    "https://api.stripe.com",
    "https://api.square.com",
    "https://api.paypal.com",
    "https://*.abacusai.app",
    "wss://*.abacusai.app",
    "https://cloudflareinsights.com",
    "https://*.cloudflareinsights.com",
  ];

  if (isDev) {
    scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
    connectSrc.push("ws:", "wss:", "http://localhost:*", "ws://localhost:*");
  }

  const securityHeaders: Record<string, string> = {
    "Content-Security-Policy": [
      "default-src 'self'",
      // nonce replaces 'unsafe-inline' — inline scripts must carry this nonce attribute
      `script-src ${scriptSrc.join(" ")}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // removed http: from img-src (audit finding)
      "img-src 'self' data: blob: https: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
      "worker-src 'self' blob:",
      `connect-src ${connectSrc.join(" ")}`,
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

function nextResponseWithNonce(
  request: NextRequest,
  nonce: string,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function middleware(request: NextRequest) {
  // Generate a unique per-request nonce for CSP
  const nonce = btoa(globalThis.crypto.randomUUID());
  const hostname = request.headers.get("host") || "";
  const subdomain = getSubdomain(hostname);

  const response = nextResponseWithNonce(request, nonce);

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
