import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // CSV imports post up to 1000 parsed rows, which overruns the 1MB default
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
