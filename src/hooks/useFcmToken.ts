"use client";

import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { useCallback, useEffect, useState } from "react";
import { getFirebaseApp, isFirebaseConfigured, VAPID_KEY } from "@/lib/firebase";

export type FcmStatus =
  | "idle"
  | "unsupported"
  | "ios-install"
  | "no-config"
  | "denied"
  | "loading"
  | "ready"
  | "error";

/** iPhone·iPad. iPadOS Safari는 Mac으로 표시되므로 터치 지원 여부로 구분함 */
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** 홈 화면에 추가한 앱으로 실행 중인지. iOS는 이 경우에만 웹 푸시 지원 */
function isStandalone() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

/** 권한을 묻기 전에 알 수 있는 상태. 버튼을 누르기 전부터 안내를 보여 주기 위함 */
function initialStatus(): FcmStatus {
  if (!isFirebaseConfigured) return "no-config";
  // iOS 16.4+ Safari 탭에도 Notification API는 있지만 푸시는 홈 화면 앱에서만 오므로 API 유무와 별개로 먼저 확인함
  if (isIos() && !isStandalone()) return "ios-install";
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "idle";
}

/**
 * FCM 웹 푸시 토큰 훅. 권한 요청은 enable()을 사용자 동작(버튼 클릭)에서 호출해야 함.
 * 이미 권한이 허용된 브라우저에서는 마운트 시 토큰을 자동으로 가져옴.
 */
export function useFcmToken() {
  const [status, setStatus] = useState<FcmStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 권한을 요청하고 토큰을 발급받음. 실패하면 null (이유는 status) */
  const enable = useCallback(async (): Promise<string | null> => {
    const before = initialStatus();
    if (before !== "idle" && before !== "denied") {
      setStatus(before);
      return null;
    }
    try {
      setStatus("loading");
      // Safari는 클릭 직후 다른 await 없이 바로 요청해야 권한 창이 뜸. 그래서 지원 여부 확인보다 먼저 요청함
      const permission =
        Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") {
        setStatus("denied");
        return null;
      }
      if (!(await isSupported())) {
        setStatus("unsupported");
        return null;
      }

      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const fcmToken = await getToken(getMessaging(getFirebaseApp()), {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      setToken(fcmToken || null);
      setStatus(fcmToken ? "ready" : "error");
      if (!fcmToken) setError("토큰이 비어 있습니다.");
      return fcmToken || null;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      return null;
    }
  }, []);

  // 이미 허용된 경우 팝업 없이 바로 토큰을 가져오고, 아니면 미리 알 수 있는 상태(차단·iOS 설치 필요 등)를 표시함
  useEffect(() => {
    queueMicrotask(() => {
      const before = initialStatus();
      if (before === "idle" && Notification.permission === "granted") void enable();
      else setStatus(before);
    });
  }, [enable]);

  // 화면을 보고 있을 때 도착한 메시지도 알림으로 표시함.
  // new Notification()은 iOS 홈 화면 앱에서 동작하지 않아 서비스 워커로 띄움
  useEffect(() => {
    if (status !== "ready") return;
    return onMessage(getMessaging(getFirebaseApp()), async (payload) => {
      const title = payload.data?.title ?? payload.notification?.title;
      if (!title) return;
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body: payload.data?.body ?? payload.notification?.body ?? "",
        icon: "/moa-gwa-logo.png",
        data: { url: payload.data?.url ?? "/" },
      });
    });
  }, [status]);

  return { status, token, error, enable };
}
