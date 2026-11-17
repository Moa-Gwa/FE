import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import "./globals.css";

// Spoqa Han Sans Neo (SIL OFL), self-hosted subset
const spoqa = localFont({
  src: [
    { path: "../fonts/SpoqaHanSansNeo-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/SpoqaHanSansNeo-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/SpoqaHanSansNeo-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-spoqa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "모아과",
  applicationName: "모아과",
  description: "대학·학과·학생자치단체의 공지를 한곳에서 확인하세요.",
  // iOS 홈 화면 앱: 상태 표시줄이 화면을 덮지 않는 기본 스타일
  appleWebApp: { capable: true, title: "모아과", statusBarStyle: "default" },
};

// 노치·홈 인디케이터 영역까지 그리고, 여백은 safe-area-inset으로 처리함
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spoqa.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
