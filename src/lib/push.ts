import { deleteToken, getMessaging, isSupported } from "firebase/messaging";
import { api } from "@/lib/api";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

/** 이 기기에서 서버에 등록한 FCM 토큰. 있으면 "이 기기 푸시 켜짐". */
const STORAGE_KEY = "moagwa.fcmToken";
const CHANGE_EVENT = "moagwa:push-token";

export function getStoredPushToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** useSyncExternalStore용 구독 함수 (같은 탭의 변경과 다른 탭의 변경 모두 알린다). */
export function subscribePushToken(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storePushToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 저장소 사용 불가 (시크릿 모드 등) */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 토큰을 현재 로그인한 사용자 계정에 연결한다. */
export async function registerPushToken(token: string) {
  await api<void>("/me/push-tokens", { method: "PUT", body: { token } });
  storePushToken(token);
}

/** 서버 등록 해제 + FCM 토큰 폐기. 로그아웃 때도 호출해 다음 사용자에게 알림이 가지 않게 한다. */
export async function unregisterPushToken() {
  const token = getStoredPushToken();
  if (!token) return;
  try {
    await api<void>("/me/push-tokens", { method: "DELETE", body: { token } });
  } finally {
    storePushToken(null);
  }
  try {
    if (isFirebaseConfigured && (await isSupported())) await deleteToken(getMessaging(getFirebaseApp()));
  } catch {
    /* 이미 만료된 토큰이면 무시 */
  }
}
