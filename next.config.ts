import type { NextConfig } from "next";

const frameAncestors = [
  "'self'",
  "https://www.sameerdossani.net",
  "https://*.sameerdossani.net",
  "https://*.mykajabi.com",
  "https://*.kajabi.com",
  "https://app.kajabi.com",
].join(" ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
