import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pg", "better-auth", "drizzle-orm"],
  transpilePackages: ["@kept/db"],
};

export default nextConfig;
