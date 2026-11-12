import { useSyncExternalStore } from "react";
import type { Session } from "@/types";

const KEY = "moagwa-session";
const listeners = new Set<() => void>();
const changeHandlers = new Set<() => void>();
let cached: { raw: string | null; value: Session | null } = { raw: null, value: null };

function read(): Session | null {
  try {
    let raw = window.localStorage.getItem(KEY);
    if (raw?.includes('"token"')) {
      // 쿠키 전환 이전 세션: 쿠키가 없어 어차피 재로그인이 필요하므로 저장된 토큰째 지운다.
      window.localStorage.removeItem(KEY);
      raw = null;
    }
    if (raw && raw.includes('"role":"ADMIN"') && !raw.includes('"operator"')) {
      // 운영자 여부 도입 이전 관리자 세션: 서버 토큰에도 운영자 권한이 없어 재로그인이 필요하므로 지운다.
      window.localStorage.removeItem(KEY);
      raw = null;
    }
    if (raw !== cached.raw) {
      cached = { raw, value: raw ? (JSON.parse(raw) as Session) : null };
    }
    return cached.value;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return typeof window === "undefined" ? null : read();
}

export function setSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lasts for this page view only */
  }
  changeHandlers.forEach((h) => h());
  listeners.forEach((l) => l());
}

/**
 * 로그인·로그아웃·세션 갱신, 다른 탭의 세션 변경 때 화면을 다시 그리기 전에 동기로 호출됨.
 * 닉네임이 같은 다른 계정도 구분할 수 없으므로 세션이 바뀔 때마다 호출한다.
 */
export function onSessionChange(handler: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) handler();
  };
  changeHandlers.add(handler);
  window.addEventListener("storage", onStorage);
  return () => {
    changeHandlers.delete(handler);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns undefined during server render / first paint, null when signed out. */
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    read,
    () => undefined,
  );
}
