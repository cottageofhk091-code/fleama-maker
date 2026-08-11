import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // 開発時の古いチャンク混在を減らす（本番はデプロイ単位で更新）
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // HTML がCDNに長く残らないよう、動的ページ向けの既定ヘッダ
  async headers() {
    return [
      {
        source: "/account",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        source: "/settings",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: {
    disable: true,
  },
  widenClientFileUpload: false,
});
