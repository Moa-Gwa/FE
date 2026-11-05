"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { setSession } from "@/lib/session";

function KakaoCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    const code = params.get("code");
    if (started.current) return;
    started.current = true;
    if (!code) {
      queueMicrotask(() => setError("카카오 인증 코드가 없습니다."));
      return;
    }
    api<{ token: string; nickname: string; onboarded: boolean; verified: boolean }>("/auth/kakao", {
      method: "POST",
      auth: false,
      body: { code, redirectUri: `${window.location.origin}/login/kakao` },
    })
      .then((res) => {
        setSession({ role: "STUDENT", token: res.token, name: res.nickname, onboarded: res.onboarded, verified: res.verified });
        router.replace(res.onboarded ? "/home" : "/my/interests?welcome=1");
      })
      .catch((e: Error) => setError(e.message));
  }, [params, router]);

  return (
    <main className="login-shell">
      <section className="login-card">{error ? <p className="error">{error}</p> : <p>로그인 중입니다…</p>}</section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <KakaoCallback />
    </Suspense>
  );
}
