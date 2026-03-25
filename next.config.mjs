/**
 * Next.js configuration with security headers.
 * Security headers provide defense-in-depth alongside middleware headers.
 * @type {import('next').NextConfig}
 */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
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
