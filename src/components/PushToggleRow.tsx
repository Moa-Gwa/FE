"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/Providers";
import { type FcmStatus, useFcmToken } from "@/hooks/useFcmToken";
import { getStoredPushToken, registerPushToken, subscribePushToken, unregisterPushToken } from "@/lib/push";

const HINT: Partial<Record<FcmStatus, string>> = {
  unsupported: "이 브라우저는 푸시 알림을 지원하지 않아요.",
  "no-config": "푸시 알림이 아직 설정되지 않았어요.",
  denied: "브라우저에서 알림이 차단되어 있어요. 주소창 왼쪽 아이콘 → 사이트 설정에서 알림을 허용해 주세요.",
};

/** "이 기기에서 푸시 알림 받기" 스위치. 켜면 권한 요청 → FCM 토큰 발급 → 서버에 등록한다. */
export default function PushToggleRow() {
  const toast = useToast();
  const fcm = useFcmToken();
  const stored = useSyncExternalStore(subscribePushToken, getStoredPushToken, () => null);
  const [busy, setBusy] = useState(false);

  // FCM이 토큰을 갱신했다면 서버에도 반영한다.
  useEffect(() => {
    if (!stored || !fcm.token || fcm.token === stored) return;
    registerPushToken(fcm.token).catch(() => {});
  }, [stored, fcm.token]);

  const blocked = fcm.status === "unsupported" || fcm.status === "no-config" || fcm.status === "denied";
  const on = !!stored && fcm.status !== "denied";

  async function toggle() {
    setBusy(true);
    try {
      if (on) {
        await unregisterPushToken();
        toast("이 기기의 푸시 알림을 껐어요.");
        return;
      }
      const token = await fcm.enable();
      if (!token) return;
      await registerPushToken(token);
      toast("이 기기에서 푸시 알림을 받아요.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "푸시 알림 설정에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="setting-row">
        <span>이 기기에서 푸시 알림 받기</span>
        <button
          className={`switch ${on ? "on" : ""}`}
          role="switch"
          aria-checked={on}
          aria-label="이 기기에서 푸시 알림 받기"
          disabled={busy || fcm.status === "unsupported" || fcm.status === "no-config"}
          onClick={toggle}
        >
          <i />
        </button>
      </div>
      {blocked && HINT[fcm.status] && <p className="hint">{HINT[fcm.status]}</p>}
    </>
  );
}
