import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { api } from "@/lib/api";
import { getFirebaseApp, isFirebaseConfigured, VAPID_KEY } from "@/lib/firebase";

/** 이 기기에서 서버에 등록한 FCM 토큰. 있으면 "이 기기 푸시 켜짐". */
const STORAGE_KEY = "moagwa.fcmToken";
const CHANGE_EVENT = "moagwa:push-token";
const SYNCED_KEY = "moagwa.fcmTokenSyncedAt";
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

/** 서버 미등록 토큰은 다음 활성화 때 다시 등록할 수 있게 함 */
export function forgetPushToken() {
  storePushToken(null);
}

/** FCM에서 만료된 토큰은 SDK 캐시까지 폐기해야 다음 활성화 때 새로 발급됨. */
export async function discardExpiredPushToken() {
  await deleteToken(getMessaging(getFirebaseApp()));
  forgetPushToken();
}

function storePushToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SYNCED_KEY);
    }
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

/**
 * 푸시를 켠 기기는 하루 한 번 현재 FCM 토큰을 서버에 다시 등록함.
 * 서버가 만료 처리로 토큰을 지웠거나 FCM이 토큰을 바꿔도 앱을 열면 다시 받게 됨(FCM 권장 방식).
 */
export async function refreshPushToken() {
  try {
    if (!getStoredPushToken() || Date.now() - Number(localStorage.getItem(SYNCED_KEY)) < SYNC_INTERVAL_MS) return;
    // 실패해도 하루 뒤 재시도. 같은 화면이 여러 번 그려질 때 중복 요청을 막으려고 먼저 기록함
    localStorage.setItem(SYNCED_KEY, String(Date.now()));
  } catch {
    return;
  }
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(getMessaging(getFirebaseApp()), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (token) await registerPushToken(token);
}

/** 이 기기로 테스트 알림을 보냄 */
export async function sendTestPush(token: string) {
  await api<void>("/me/push-tokens/test", { method: "POST", body: { token } });
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
