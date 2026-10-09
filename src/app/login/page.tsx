/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { isFirebaseAuthConfigured } from "@/lib/firebase";
import { getGoogleIdToken } from "@/lib/googleLogin";
import { setSession } from "@/lib/session";
import type { OrgRef } from "@/types";

const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;

type Mode = "choose" | "student" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function admin(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ token: string; name: string; organization: OrgRef }>("/admin/auth/login", {
        method: "POST",
        auth: false,
        body: { loginId: formData.get("loginId"), password: formData.get("password") },
      });
      setSession({ role: "ADMIN", token: res.token, name: res.name, organization: res.organization });
      router.replace("/admin/dashboard");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** 구글 로그인: Firebase로 구글 인증 → ID 토큰을 서버에 보내 우리 세션으로 교환한다. */
  async function google() {
    setBusy(true);
    setError("");
    try {
      const idToken = await getGoogleIdToken();
      const res = await api<{ token: string; nickname: string; onboarded: boolean }>("/auth/google", {
        method: "POST",
        auth: false,
        body: { idToken },
      });
      setSession({ role: "STUDENT", token: res.token, name: res.nickname, onboarded: res.onboarded });
      router.replace(res.onboarded ? "/home" : "/my/interests?welcome=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function kakao() {
    const redirect = `${window.location.origin}/login/kakao`;
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-hero">
          <img className="brand-orb" src="/moa-gwa-logo.png" alt="모아과 로고" />
          <div className="brand-name">모아과</div>
          <h1>
            우리 학교 소식을
            <br />
            <em>한곳에서</em> 만나보세요
          </h1>
          <p className="muted">흩어진 공지를 모아, 더 쉽고 빠르게.</p>
        </div>

        {error && <p className="error" style={{ marginTop: 18 }}>{error}</p>}

        {mode === "choose" && (
          <div className="role-buttons">
            <button className="role" onClick={() => setMode("student")}>
              <span className="role-icon">
                <Icon name="cap" />
              </span>
              <span>
                <strong>학생으로 시작</strong>
                <span>나에게 필요한 공지와 일정을 확인해요</span>
              </span>
              <span className="role-go" aria-hidden="true">
                <Icon name="chevron" />
              </span>
            </button>
            <button className="role admin" onClick={() => setMode("admin")}>
              <span className="role-icon">
                <Icon name="megaphone" />
              </span>
              <span>
                <strong>관리자로 시작</strong>
                <span>공지와 학내 일정을 관리해요</span>
              </span>
              <span className="role-go" aria-hidden="true">
                <Icon name="chevron" />
              </span>
            </button>
          </div>
        )}

        {mode === "student" && (
          <div className="role-buttons">
            {isFirebaseAuthConfigured && (
              <button
                type="button"
                className="social-login google-login"
                disabled={busy}
                onClick={google}
              >
                <img src="/auth/google-g-logo.png" alt="" aria-hidden="true" />
                <span>Google로 로그인</span>
                <span aria-hidden="true" />
              </button>
            )}
            {KAKAO_CLIENT_ID && (
              <button
                type="button"
                className="social-login kakao-login"
                aria-label="카카오 로그인"
                disabled={busy}
                onClick={kakao}
              >
                <img src="/auth/kakao-login-complete-ko.svg" alt="" aria-hidden="true" />
              </button>
            )}
            {!KAKAO_CLIENT_ID && !isFirebaseAuthConfigured && <p className="error">로그인이 아직 설정되지 않았습니다.</p>}
            <button className="link-btn" onClick={() => setMode("choose")}>
              ← 돌아가기
            </button>
          </div>
        )}

        {mode === "admin" && (
          <form action={admin} className="role-buttons" style={{ textAlign: "left" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="loginId">아이디</label>
              <input id="loginId" name="loginId" required autoComplete="username" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="password">비밀번호</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <button className="primary" disabled={busy}>
              로그인
            </button>
            <button type="button" className="link-btn" onClick={() => setMode("choose")}>
              ← 돌아가기
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
