"use client";

import { getMessaging, isSupported, onMessage } from "firebase/messaging";
import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { getStoredPushToken, subscribePushToken } from "@/lib/push";

/** 페이지 이동과 무관하게 학생 화면 전체에서 포그라운드 푸시를 표시한다. */
export function useForegroundPush(enabled: boolean) {
  const token = useSyncExternalStore(subscribePushToken, getStoredPushToken, () => null);
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled || !token || !isFirebaseConfigured) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    async function listen() {
      if (!await isSupported() || cancelled || Notification.permission !== "granted") return;
      unsubscribe = onMessage(getMessaging(getFirebaseApp()), async payload => {
        void client.invalidateQueries({ queryKey: ["notifications"] });
        const title = payload.data?.title ?? payload.notification?.title;
        if (!title) return;
        try {
          const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
          await registration?.showNotification(title, {
            body: payload.data?.body ?? payload.notification?.body ?? "",
            icon: "/moa-gwa-logo.png", data: { url: payload.data?.url ?? "/" },
          });
        } catch (error) { console.error("푸시 알림 표시 실패", error); }
      });
    }
    void listen().catch(error => console.error("푸시 알림 수신 초기화 실패", error));
    return () => { cancelled = true; unsubscribe?.(); };
  }, [enabled, token, client]);
}
