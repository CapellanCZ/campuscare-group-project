import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildSecurityHeaders } from "./lib/security/headers"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["xlsx"],
  poweredByHeader: false,
  compress: true,
  // Keep Next.js DevTools off the left edge so it does not cover queue/list content.
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "recharts",
      "lucide",
      "motion",
      "motion/react",
    ],
    // Keep recently visited dashboard segments in the client router cache so
    // sidebar revisits paint from cache instead of waiting on the network.
    staleTimes: {
      // Keep staff segments cached longer so sidebar revisits paint instantly.
      dynamic: 300,
      static: 900,
    },
  },
  async redirects() {
    return [
      // Edge redirect — bypasses proxy compile so `/` never hangs on cold start.
      {
        source: "/",
        destination: "/landing",
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(),
      },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default nextConfig
