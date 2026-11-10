"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import InlineError from "@/components/InlineError";
import { runGoogleLogin, type GoogleSession } from "@/lib/googleLogin";
import { setSession } from "@/lib/session";

export default function GoogleCallbackPage() {
  const operation = useRef<Promise<GoogleSession | null> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    operation.current ??= runGoogleLogin();
    operation.current.then((session) => {
      if (!active || !session) return;
      setSession({ role: "STUDENT", name: session.nickname, onboarded: session.onboarded, verified: session.verified });
      window.location.replace(session.onboarded ? "/home" : "/my/interests?welcome=1");
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "구글 로그인에 실패했어요.");
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="login-shell">
      <section className="login-card">
        {error ? <><InlineError error={error} /><Link href="/login">로그인 화면으로 돌아가기</Link></>
          : <p role="status">구글 로그인 처리 중입니다…</p>}
      </section>
    </main>
  );
}
