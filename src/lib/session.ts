import { useSyncExternalStore } from "react";
import type { Session } from "@/types";

const KEY = "moagwa-session";
const listeners = new Set<() => void>();
let cached: { raw: string | null; value: Session | null } = { raw: null, value: null };

function read(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
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
  listeners.forEach((l) => l());
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
