"use client";

import { useEffect, useState } from "react";
import { clearInstallPrompt, pendingInstallPrompt, type InstallPromptEvent } from "@/lib/installPrompt";

const INSTALL_KEY = "moagwa:install-notice-dismissed";
const DESKTOP_KEY = "moagwa:admin-desktop-notice-dismissed";

function wasDismissed(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function remember(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // 저장소를 쓸 수 없으면 이번 화면에서만 닫음
  }
}

function iosSafariGuide() {
  const standalone =
    matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ua = navigator.userAgent;
  // iOS Safari는 설치 이벤트가 없어 공유 메뉴 안내로 대체. 카카오톡 등 앱 내 브라우저는 홈 화면 추가 불가
  return !standalone && /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|Instagram|NAVER/.test(ua);
}

/** 웹앱 설치 안내, 오프라인 안내, 관리자 데스크톱 권장 안내. Shell이 세션 확인 뒤 브라우저에서만 그림 */
export default function AppNotices({ role }: { role: "STUDENT" | "ADMIN" }) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(pendingInstallPrompt);
  const [iosGuide] = useState(iosSafariGuide);
  const [narrow, setNarrow] = useState(() => matchMedia("(max-width: 1023px)").matches);
  const [dismissed, setDismissed] = useState(() => ({ install: wasDismissed(INSTALL_KEY), desktop: wasDismissed(DESKTOP_KEY) }));

  useEffect(() => {
    const narrowQuery = matchMedia("(max-width: 1023px)");
    const onNarrow = (e: MediaQueryListEvent) => setNarrow(e.matches);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstallPrompt = (e: Event) => setInstallEvent(e as InstallPromptEvent);
    const onInstalled = () => {
      clearInstallPrompt();
      setInstallEvent(null);
    };
    narrowQuery.addEventListener("change", onNarrow);
    addEventListener("online", onOnline);
    addEventListener("offline", onOffline);
    addEventListener("beforeinstallprompt", onInstallPrompt);
    addEventListener("appinstalled", onInstalled);
    return () => {
      narrowQuery.removeEventListener("change", onNarrow);
      removeEventListener("online", onOnline);
      removeEventListener("offline", onOffline);
      removeEventListener("beforeinstallprompt", onInstallPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = (key: "install" | "desktop") => {
    remember(key === "install" ? INSTALL_KEY : DESKTOP_KEY);
    setDismissed((d) => ({ ...d, [key]: true }));
  };

  const install = async () => {
    await installEvent?.prompt();
    clearInstallPrompt();
    setInstallEvent(null);
  };

  return (
    <>
      {!online && (
        <div className="app-notice" role="status">
          <p>인터넷 연결이 끊겼어요. 연결되면 최신 내용을 다시 불러와요.</p>
        </div>
      )}
      {role === "ADMIN" && narrow && !dismissed.desktop && (
        <div className="app-notice">
          <p>공지 작성·관리는 데스크톱(PC) 화면에서 더 편하게 할 수 있어요.</p>
          <button type="button" className="app-notice-close" aria-label="안내 닫기" onClick={() => close("desktop")}>×</button>
        </div>
      )}
      {!dismissed.install && (installEvent || iosGuide) && (
        <div className="app-notice">
          <p>
            {installEvent
              ? "모아과를 앱으로 설치하면 홈 화면에서 바로 열고 알림을 받을 수 있어요."
              : "Safari 공유 버튼에서 '홈 화면에 추가'를 누르면 앱처럼 쓰고 알림도 받을 수 있어요."}
          </p>
          {installEvent && (
            <button type="button" className="secondary" onClick={install}>설치</button>
          )}
          <button type="button" className="app-notice-close" aria-label="안내 닫기" onClick={() => close("install")}>×</button>
        </div>
      )}
    </>
  );
}
