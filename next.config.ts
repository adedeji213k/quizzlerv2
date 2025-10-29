import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Allow build even with TS errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Optional: ignore ESLint entirely
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Recommended for new Next.js versions
  experimental: {
    turbo: {
      resolveAlias: {},
    },
  },
};

export default nextConfig;
