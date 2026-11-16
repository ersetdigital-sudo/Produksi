import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["pg", "postgres"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
