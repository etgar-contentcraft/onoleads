/**
 * Next.js configuration with security headers.
 * Security headers provide defense-in-depth alongside middleware headers.
 * @type {import('next').NextConfig}
 */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Allow YouTube / nocookie embeds in iframes on our pages
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.youtube.com https://i.ytimg.com https:",
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://calendar.google.com https://calendly.com",
      "connect-src 'self' https://*.supabase.co https://api.supabase.co wss://*.supabase.co https://hooks.zapier.com https://www.google-analytics.com",
      "media-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
    ].join("; "),
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
];

/** Cache TTL for optimized images: 30 days in seconds */
const IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Cache-Control for landing pages: 1 hour fresh, 24 hours stale-while-revalidate */
const LP_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

/** Cache-Control for immutable Next.js image assets: 1 year */
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const nextConfig = {
  /* Enable gzip compression for responses */
  compress: true,

  /* Apply security + caching headers to all routes */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/lp/:slug*",
        headers: [
          { key: "Cache-Control", value: LP_CACHE_CONTROL },
        ],
      },
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: IMMUTABLE_CACHE_CONTROL },
        ],
      },
    ];
  },

  /* Image optimization with modern formats and caching */
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: IMAGE_CACHE_TTL_SECONDS,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ono.ac.il",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },

  /* Disable x-powered-by header to reduce information leakage */
  poweredByHeader: false,
};

export default nextConfig;
