import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["xlsx"],
  experimental: {
    optimizePackageImports: ["@tabler/icons-react", "recharts", "lucide"],
    // Keep recently visited dashboard segments in the client router cache so
    // sidebar revisits paint from cache instead of waiting on the network.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
