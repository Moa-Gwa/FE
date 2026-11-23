import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import IosInputZoomLock, { VIEWPORT_SCALE } from "@/components/IosInputZoomLock";
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
// iOS는 IosInputZoomLock의 IOS_VIEWPORT가 마지막 태그로 적용되므로, 값을 바꾸면 그쪽도 같이 수정
export const viewport: Viewport = {
  width: "device-width",
  // 모바일 화면이 커 보여 PC 브라우저 80% 축소와 같은 배율로 그림(PC는 이 값을 무시함)
  initialScale: VIEWPORT_SCALE,
  // 입력창 초점 시 확대 방지(maximum-scale)는 iOS에서만 IosInputZoomLock이 건다
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spoqa.variable}`}>
      <head>
        <IosInputZoomLock />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
