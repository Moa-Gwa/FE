import type { Metadata } from "next";
import { DM_Sans, Gowun_Dodum } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const dm = DM_Sans({ variable: "--font-dm", subsets: ["latin"] });
const gowun = Gowun_Dodum({ variable: "--font-gowun", weight: "400", preload: false });

export const metadata: Metadata = {
  title: "모아과 — 학내 통합 공지",
  description: "대학·학과·학생자치단체의 공지를 한곳에서 확인하세요.",
  icons: { icon: "/moa-gwa-logo.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${dm.variable} ${gowun.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
