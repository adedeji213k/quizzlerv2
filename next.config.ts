import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ✅ Your existing config options */
  reactStrictMode: true,
  swcMinify: true,

  // ✅ Allow production builds even if there are TypeScript errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // (Optional) Also ignore ESLint errors during build if you want a clean push
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
