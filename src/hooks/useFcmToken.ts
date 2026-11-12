"use client";

import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { useCallback, useEffect, useState } from "react";
import { getFirebaseApp, isFirebaseConfigured, VAPID_KEY } from "@/lib/firebase";

export type FcmStatus = "idle" | "unsupported" | "no-config" | "denied" | "loading" | "ready" | "error";

/**
 * FCM 웹 푸시 토큰 훅. 권한 요청은 enable()을 사용자 동작(버튼 클릭)에서 호출해야 한다 (Safari 요구사항).
 * 이미 권한이 허용된 브라우저에서는 마운트 시 토큰을 자동으로 가져온다.
 */
export function useFcmToken() {
  const [status, setStatus] = useState<FcmStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** 권한을 요청하고 토큰을 발급받는다. 실패하면 null (이유는 status). */
  const enable = useCallback(async (): Promise<string | null> => {
    if (!isFirebaseConfigured) {
      setStatus("no-config");
      return null;
    }
    try {
      if (!(await isSupported())) {
        setStatus("unsupported");
        return null;
      }
      setStatus("loading");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return null;
      }

      const app = getFirebaseApp();
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const fcmToken = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
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

  // 이미 허용된 경우 팝업 없이 바로 토큰을 가져온다.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") queueMicrotask(() => void enable());
  }, [enable]);

  // 화면을 보고 있을 때 도착한 메시지를 알림으로 표시한다.
  useEffect(() => {
    if (status !== "ready") return;
    const unsubscribe = onMessage(getMessaging(getFirebaseApp()), (payload) => {
      console.log("포그라운드 메시지 수신:", payload);
      const title = payload.data?.title ?? payload.notification?.title;
      if (!title) return;
      const n = new Notification(title, { body: payload.data?.body ?? payload.notification?.body });
      const url = payload.data?.url;
      if (url) n.onclick = () => (window.location.href = url);
    });
    return unsubscribe;
  }, [status]);

  return { status, token, error, enable };
}
