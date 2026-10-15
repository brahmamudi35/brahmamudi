import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Playwright suite builds into its own folder so it never clobbers .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
