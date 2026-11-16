import type { MetadataRoute } from "next";

/** 홈 화면에 추가했을 때 앱처럼 열리게 함. iOS는 이렇게 설치한 경우에만 웹 푸시를 받을 수 있음 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "모아과",
    short_name: "모아과",
    description: "대학·학과·학생자치단체의 공지를 한곳에서 확인하세요.",
    lang: "ko",
    // 로그인 상태에 따라 학생 홈·관리자 대시보드·로그인으로 이동함
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
