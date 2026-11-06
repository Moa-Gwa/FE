import { getSession, setSession } from "@/lib/session";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; auth?: boolean };

export async function api<T>(path: string, { body, auth = true, headers, ...init }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "X-Requested-With": "fetch", // 쿠키 인증 쓰기 요청의 CSRF 방어용 헤더
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (res.status === 401 && auth && getSession()) {
    setSession(null); // session cookie expired or invalid
  }
  if (!res.ok) {
    let message = `요청에 실패했습니다 (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function assetUrl(url: string): string {
  return url.startsWith("/uploads/") || url.startsWith("/instagram/") ? `${API_BASE}${url}` : url;
}

/** 서버가 세션 쿠키를 지우게 한 뒤 로컬 세션도 비운다. 서버 호출이 실패해도 로컬은 로그아웃된다. */
export async function logout() {
  await api<void>("/auth/logout", { method: "POST" }).catch(() => {});
  setSession(null);
}
