import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['ascendo.debojyotidey.online'],
  turbopack: {
    root: path.join(__dirname),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
};

export default nextConfig;
