import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용: 실행에 필요한 파일만 .next/standalone에 모은다.
  output: "standalone",
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: "https://moa-gwa.firebaseapp.com/__/auth/:path*" },
      { source: "/__/firebase/:path*", destination: "https://moa-gwa.firebaseapp.com/__/firebase/:path*" },
      ...(process.env.NODE_ENV === "development" ? [
                { source: "/api/:path*", destination: "http://localhost:8080/api/:path*" },
        { source: "/ws", destination: "http://localhost:8080/ws" },
        { source: "/uploads/:path*", destination: "http://localhost:8080/uploads/:path*" },
        { source: "/instagram/:path*", destination: "http://localhost:8080/instagram/:path*" },
      ] : []),
    ];
  },
};

export default nextConfig;
