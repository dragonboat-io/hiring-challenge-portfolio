import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon — it must stay a real require() in the
  // server bundle rather than being traced and bundled by Next.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
