import type { Metadata } from "next";
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
  title: "모아과 — 학내 통합 공지",
  description: "대학·학과·학생자치단체의 공지를 한곳에서 확인하세요.",
  icons: { icon: "/moa-gwa-logo.png" },
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
