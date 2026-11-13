import { getSession, setSession } from "@/lib/session";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST", credentials: "include", headers: { "X-Requested-With": "fetch" },
    }).then(res => {
      if (res.status === 401) return false;
      if (!res.ok) throw new ApiError(res.status, "로그인 갱신에 실패했습니다. 다시 시도해 주세요.");
      return true;
    }).finally(() => { refreshing = null; });
  }
  return refreshing;
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

export async function api<T>(path: string, { body, auth = true, headers, ...init }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const send = () => fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "X-Requested-With": "fetch", // 쿠키 인증 쓰기 요청의 CSRF 방어용 헤더
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  let res = await send();
  if (res.status === 401 && auth && !path.includes("/auth/")) {
    // 다른 탭이 먼저 갱신했다면 재요청만 하고, 여전히 만료됐을 때 토큰을 갱신한다.
    const retry = async () => {
      res = await send();
      if (res.status === 401 && await refreshSession()) res = await send();
    };
    if (typeof navigator !== "undefined" && navigator.locks) {
      await navigator.locks.request("moagwa-auth-refresh", retry);
    } else {
      if (await refreshSession()) res = await send();
    }
    if (res.status === 401 && getSession()) setSession(null);
  }
  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function assetUrl(url: string): string {
  return url.startsWith("/uploads/") || url.startsWith("/instagram/") ? `${API_BASE}${url}` : url;
}

/** 서버 쿠키와 갱신 토큰을 폐기한 뒤 로컬 세션을 비운다. */
export async function logout() {
  await api<void>("/auth/logout", { method: "POST" });
  setSession(null);
}
