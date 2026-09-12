import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  // Repository guidance is maintained explicitly, including during local dev.
  agentRules: false,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@taxsorted/engine"],
};

export default nextConfig;
