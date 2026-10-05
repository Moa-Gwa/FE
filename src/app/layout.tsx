import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import "./globals.css";

// Pretendard (SIL OFL), self-hosted variable font
const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "모아과 — 학내 통합 공지",
  description: "대학·학과·학생자치단체의 공지를 한곳에서 확인하세요.",
  icons: { icon: "/moa-gwa-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
