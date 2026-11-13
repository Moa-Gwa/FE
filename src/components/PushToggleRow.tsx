"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import { type FcmStatus, useFcmToken } from "@/hooks/useFcmToken";
import { ApiError } from "@/lib/api";
import {
  discardExpiredPushToken,
  forgetPushToken,
  getStoredPushToken,
  registerPushToken,
  sendTestPush,
  subscribePushToken,
  unregisterPushToken,
} from "@/lib/push";

const isSafari = () => /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);

function hint(status: FcmStatus): string | null {
  switch (status) {
    case "checking":
      return "푸시 알림 지원 여부를 확인하고 있어요.";
    case "unsupported":
      return "이 브라우저는 푸시 알림을 지원하지 않아요.";
    case "ios-install":
      return "iPhone·iPad는 Safari 공유 버튼 → '홈 화면에 추가'로 설치한 앱에서 알림을 켤 수 있어요.";
    case "no-config":
      return "푸시 알림이 아직 설정되지 않았어요.";
    case "denied":
      return isSafari()
        ? "알림이 차단되어 있어요. Safari 설정 → 웹사이트 → 알림에서 이 사이트를 허용해 주세요."
        : "알림이 차단되어 있어요. 주소창 왼쪽 아이콘 → 사이트 설정에서 알림을 허용해 주세요.";
    default:
      return null;
  }
}

/** "이 기기에서 푸시 알림 받기" 스위치. 켜면 권한 요청 → FCM 토큰 발급 → 서버에 등록함 */
export default function PushToggleRow() {
  const toast = useToast();
  const fcm = useFcmToken();
  const stored = useSyncExternalStore(subscribePushToken, getStoredPushToken, () => null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FCM이 토큰을 갱신했다면 서버에도 반영함
  useEffect(() => {
    if (!stored || !fcm.token || fcm.token === stored) return;
    registerPushToken(fcm.token).catch(() => {});
  }, [stored, fcm.token]);

  const unavailable = fcm.status === "unsupported" || fcm.status === "ios-install" || fcm.status === "no-config";
  const pending = busy || testing || fcm.status === "checking" || fcm.status === "loading";
  const on = !!stored && !unavailable && fcm.status !== "checking" && fcm.status !== "denied";
  const message = hint(fcm.status);

  async function toggle() {
    setBusy(true);
    setError(null);
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
      setError(e instanceof Error ? e.message : "푸시 알림 설정에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    if (!stored) return;
    setTesting(true);
    setError(null);
    try {
      await sendTestPush(stored);
      toast("테스트 알림을 보냈어요. 잠시 후 이 기기에 도착해요.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) forgetPushToken();
      if (e instanceof ApiError && e.status === 410) {
        try {
          await discardExpiredPushToken();
        } catch {
          setError("만료된 알림 등록을 초기화하지 못했어요. 테스트를 다시 눌러 주세요.");
          return;
        }
      }
      setError(e instanceof Error ? e.message : "테스트 알림을 보내지 못했어요.");
    } finally {
      setTesting(false);
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
          disabled={pending || unavailable}
          onClick={toggle}
        >
          <i />
        </button>
      </div>
      {!on && !message && <p className="hint">켜면 브라우저가 알림 허용 여부를 물어봐요.</p>}
      {message && <p className="hint">{message}</p>}
      {on && (
        <div className="setting-row">
          <span>테스트 알림</span>
          <button type="button" className="secondary" disabled={pending || unavailable} onClick={test}>
            {testing ? "보내는 중…" : "보내기"}
          </button>
        </div>
      )}
      <InlineError error={error ?? fcm.error} />
    </>
  );
}
