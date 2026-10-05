import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  transpilePackages: ["@capacitor/core", "@capacitor/geolocation"],
  async headers() {
    return [
      {
        source: "/downloads/:path*.apk",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="asset-operations.apk"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

export default nextConfig;
