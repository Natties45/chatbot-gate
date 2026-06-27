import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@prisma/client', '@libsql/client', '@prisma/adapter-libsql'],
};

export default nextConfig;
