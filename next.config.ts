import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET || "http://localhost:8080";

const nextConfig: NextConfig = {
  // Docker 이미지용: 실행에 필요한 파일만 .next/standalone에 모은다.
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 개발 서버 프록시가 SSE(/api/stream)를 gzip으로 모아 보내 실시간 반영이 멈추므로 개발 중에는 압축 끔
  compress: process.env.NODE_ENV !== "development",
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: "https://moa-gwa.firebaseapp.com/__/auth/:path*" },
      { source: "/__/firebase/:path*", destination: "https://moa-gwa.firebaseapp.com/__/firebase/:path*" },
      // 개발 서버만 BE로 프록시. E2E는 전용 BE를 쓰도록 API_PROXY_TARGET으로 바꿈
      ...(process.env.NODE_ENV === "development" ? [
        { source: "/api/:path*", destination: `${apiProxyTarget}/api/:path*` },
        { source: "/ws", destination: `${apiProxyTarget}/ws` },
        { source: "/uploads/:path*", destination: `${apiProxyTarget}/uploads/:path*` },
        { source: "/instagram/:path*", destination: `${apiProxyTarget}/instagram/:path*` },
      ] : []),
    ];
  },
};

export default nextConfig;
