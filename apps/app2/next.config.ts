import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/app2',
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
