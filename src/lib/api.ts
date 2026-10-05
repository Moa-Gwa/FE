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
  const token = auth ? getSession()?.token : undefined;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  if (res.status === 401 && token) {
    setSession(null); // token expired or invalid
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
  return url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;
}
