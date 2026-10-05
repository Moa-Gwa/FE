/* eslint-disable @next/next/no-img-element */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";
import { setSession } from "@/lib/session";
import type { OrgRef } from "@/types";

const KAKAO_CLIENT_ID = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
const SHOW_DEV_LOGIN = process.env.NODE_ENV !== "production";

type Mode = "choose" | "student" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function devStudent(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      const nickname = String(formData.get("nickname") ?? "").trim();
      const res = await api<{ token: string; nickname: string; onboarded: boolean }>("/auth/dev-student", {
        method: "POST",
        auth: false,
        body: { nickname },
      });
      setSession({ role: "STUDENT", token: res.token, name: res.nickname, onboarded: res.onboarded });
      router.replace(res.onboarded ? "/home" : "/my/interests?welcome=1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

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

  function kakao() {
    const redirect = `${window.location.origin}/login/kakao`;
    window.location.href =
      `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-orb">
          <img src="/moa-gwa-logo.png" alt="" />
        </div>
        <Logo />
        <h1>
          우리 학교 소식을
          <br />한곳에서 만나보세요
        </h1>
        <p className="muted">흩어진 공지를 모아, 더 쉽고 빠르게.</p>

        {error && <p className="error" style={{ marginTop: 18 }}>{error}</p>}

        {mode === "choose" && (
          <div className="role-buttons">
            <button className="role" onClick={() => setMode("student")}>
              <span className="role-icon">☺</span>
              <span>
                <strong>학생으로 시작</strong>
                <span>나에게 필요한 공지와 일정을 확인해요</span>
              </span>
            </button>
            <button className="role admin" onClick={() => setMode("admin")}>
              <span className="role-icon">⚙</span>
              <span>
                <strong>관리자로 시작</strong>
                <span>공지와 학내 일정을 관리해요</span>
              </span>
            </button>
          </div>
        )}

        {mode === "student" && (
          <div className="role-buttons">
            {KAKAO_CLIENT_ID && (
              <button className="primary" style={{ background: "#fee500", color: "#191919", boxShadow: "none" }} onClick={kakao}>
                카카오로 시작하기
              </button>
            )}
            {SHOW_DEV_LOGIN && (
              <form action={devStudent} className="stack" style={{ textAlign: "left" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="nickname">개발용 로그인 (닉네임)</label>
                  <input id="nickname" name="nickname" required maxLength={30} placeholder="예: 지민" />
                  <span className="hint">카카오 앱 키가 없는 로컬 개발에서만 보입니다.</span>
                </div>
                <button className="primary" disabled={busy}>
                  시작하기
                </button>
              </form>
            )}
            {!KAKAO_CLIENT_ID && !SHOW_DEV_LOGIN && <p className="error">로그인이 아직 설정되지 않았습니다.</p>}
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
