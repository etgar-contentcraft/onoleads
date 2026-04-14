/**
 * Next.js middleware for authentication, security headers, and CSRF token management.
 * Runs on every matched request to enforce security policies.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Session inactivity timeout in seconds (30 minutes) */
const SESSION_TIMEOUT_SECONDS = 30 * 60;

/**
 * Content Security Policy directives.
 * Restricts resource loading to trusted origins only.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Tracking pixel scripts: GA4, Meta, TikTok, LinkedIn, Outbrain, Taboola, Twitter, Clarity
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://analytics.tiktok.com https://snap.licdn.com https://amplify.outbrain.com https://cdn.taboola.com https://static.ads-twitter.com https://www.clarity.ms",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // YouTube thumbnails + Supabase storage + tracking pixels + Clarity
  "img-src 'self' data: blob: https://www.ono.ac.il https://*.supabase.co https://i.ytimg.com https://img.youtube.com https://www.facebook.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms https:",
  "font-src 'self' https://fonts.gstatic.com",
  // Data collection endpoints for all tracking platforms
  "connect-src 'self' https://*.supabase.co https://fonts.googleapis.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.facebook.com https://connect.facebook.net https://graph.facebook.com https://analytics.tiktok.com https://px.ads.linkedin.com https://tr.outbrain.com https://trc.taboola.com https://ads-api.twitter.com https://www.clarity.ms https://*.clarity.ms",
  // Allow same-origin iframes (heatmap preview) + YouTube embeds + Facebook
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/**
 * Applies security headers to the response.
 * @param response - NextResponse to add headers to
 * @param allowSameOriginFrame - When true (for /lp/ routes), allows same-origin iframes
 *   so the analytics heatmap can preview landing pages in an iframe.
 * @returns The response with security headers set
 */
function applySecurityHeaders(response: NextResponse, allowSameOriginFrame = false): NextResponse {
  /* Content Security Policy - restrict resource loading.
   * Landing pages allow frame-ancestors 'self' so the dashboard heatmap can embed them. */
  const csp = allowSameOriginFrame
    ? CSP_DIRECTIVES.replace("frame-ancestors 'none'", "frame-ancestors 'self'")
    : CSP_DIRECTIVES;
  response.headers.set("Content-Security-Policy", csp);

  /* Prevent clickjacking — landing pages allow same-origin for heatmap preview */
  response.headers.set("X-Frame-Options", allowSameOriginFrame ? "SAMEORIGIN" : "DENY");

  /* Prevent MIME type sniffing */
  response.headers.set("X-Content-Type-Options", "nosniff");

  /* Control referrer information */
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  /* Disable browser features we don't use */
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
  );

  /* Enforce HTTPS */
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  /* XSS protection for older browsers */
  response.headers.set("X-XSS-Protection", "1; mode=block");

  /* Prevent DNS prefetching to external domains */
  response.headers.set("X-DNS-Prefetch-Control", "off");

  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          // IMPORTANT: Use Supabase's own cookie options — do NOT override with httpOnly:true.
          // Supabase auth cookies must be readable by client-side JS so the browser client
          // can attach the JWT to API requests. httpOnly:true breaks the browser Supabase client.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /* Refresh session if expired */
  const { data: { user } } = await supabase.auth.getUser()

  /* Protect dashboard routes - redirect to login if not authenticated */
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    return applySecurityHeaders(redirectResponse)
  }

  /* Session timeout for admin users: check last activity timestamp */
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const lastActivity = request.cookies.get('ono_last_activity')?.value;
    const now = Math.floor(Date.now() / 1000);

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity, 10);
      if (elapsed > SESSION_TIMEOUT_SECONDS) {
        /* Session expired due to inactivity - force logout */
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('expired', '1');
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('ono_last_activity');
        return applySecurityHeaders(redirectResponse);
      }
    }

    /* Update last activity timestamp */
    supabaseResponse.cookies.set('ono_last_activity', now.toString(), {
      path: '/',
      maxAge: SESSION_TIMEOUT_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  /* Set CSRF token cookie for form protection (double-submit cookie pattern) */
  if (!request.cookies.get('csrf_token')) {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const csrfToken = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

    supabaseResponse.cookies.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: false, /* Must be readable by JavaScript for double-submit pattern */
      secure: process.env.NODE_ENV === 'production',
      /*
       * SameSite=Lax (not Strict): allows the cookie to be sent on the first
       * navigation from an external link (Google/Facebook ads). Strict blocks
       * the cookie on cross-site GET navigations, causing form submissions to
       * fail for visitors arriving from ad clicks.
       * SameSite=Lax still blocks cross-site POST attacks — CSRF protection remains intact.
       */
      sameSite: 'lax',
      maxAge: 30 * 60, /* 30 minutes — matches SESSION_TIMEOUT_SECONDS */
    });
  }

  /* Apply security headers — landing pages allow same-origin framing for heatmap preview */
  const isLandingPage = request.nextUrl.pathname.startsWith("/lp/");
  return applySecurityHeaders(supabaseResponse, isLandingPage);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
