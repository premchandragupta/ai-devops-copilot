import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // keep whatever experimental opts you need
    optimizePackageImports: ["@/components/ui"],
  },
  // Silence Watchpack trying to scan Windows system files
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "C:/pagefile.sys",
          "C:/hiberfil.sys",
          "C:/swapfile.sys",
          "C:/DumpStack.log.tmp",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
