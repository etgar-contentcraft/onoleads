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
      "img-src 'self' data: blob: https: http:",
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

const nextConfig = {
  /* Apply security headers to all routes */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  /* Restrict allowed image domains */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.ono.ac.il",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  /* Disable x-powered-by header to reduce information leakage */
  poweredByHeader: false,
};

export default nextConfig;
