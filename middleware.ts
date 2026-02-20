
/**
 * Next.js Middleware for Security Headers, Rate Limiting, and Subdomain Routing
 * Runs on all requests before they reach the API routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Extract subdomain from hostname
function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  // For localhost or single-part domains, no subdomain
  if (parts.length <= 2 || hostname.includes('localhost')) {
    return null;
  }
  
  // For domains like spikes.soshogle.com
  // parts = ['spikes', 'soshogle', 'com']
  const subdomain = parts[0];
  
  // Ignore reserved subdomains
  const reserved = ['www', 'app', 'api', 'admin', 'cdn', 'static'];
  if (reserved.includes(subdomain.toLowerCase())) {
    return null;
  }
  
  return subdomain;
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);
  
  const response = NextResponse.next();
  
  // Add subdomain to request headers if present
  if (subdomain) {
    response.headers.set('x-tenant-subdomain', subdomain);
    // Also add to cookies for easy client-side access
    response.cookies.set('tenant-subdomain', subdomain, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
    });
  }

  // Check if this is an OAuth callback or auth-related route
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth') || 
                      request.nextUrl.pathname.includes('oauth') ||
                      request.nextUrl.pathname.includes('callback');

  // Security Headers
  const securityHeaders = {
    // Content Security Policy (CSP)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://*.googleapis.com https://api.elevenlabs.io wss://api.elevenlabs.io https://livekit.rtc.elevenlabs.io wss://livekit.rtc.elevenlabs.io https://api.twilio.com https://api.stripe.com https://api.square.com https://api.paypal.com https://*.abacusai.app wss://*.abacusai.app https://cloudflareinsights.com https://*.cloudflareinsights.com",
      "frame-src 'self' blob: https: https://accounts.google.com https://www.paypal.com https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://vercel.com https://*.vercel.app https://*.soshogle.com https://calendly.com https://*.calendly.com https://www.youtube.com https://*.youtube.com https://youtube.com https://player.vimeo.com https://*.vimeo.com https://*.elevenlabs.io https://elevenlabs.io https://*.vapi.ai https://vapi.ai https://search.google.com https://www.zebracat.ai https://www.clay.com https://www.starcloud.com https://www.neoculturalcouture.com https://www.little-lagniappe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join('; '),

    // Strict Transport Security (HSTS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Prevent clickjacking
    'X-Frame-Options': 'SAMEORIGIN',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (allow microphone for voice AI agent testing)
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
  };

  // For OAuth routes, use a more permissive COOP policy to allow popup communication
  if (isAuthRoute) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  } else {
    // For other routes, use the default same-origin policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Allow cross-origin for signed-url (website voice agents e.g. Theodora)
    if (request.nextUrl.pathname === '/api/elevenlabs/signed-url') {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
