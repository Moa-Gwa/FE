"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import InlineError from "@/components/InlineError";
import { api, logout } from "@/lib/api";
import { getSession, setSession, useSession } from "@/lib/session";

type ConsentStatus = { required: boolean; version: string };

function Consent() {
  const router = useRouter();
  const session = useSession();
  // 외부 주소로 보내지 않도록 앱 내부 경로만 허용
  const nextParam = useSearchParams().get("next");
  const next = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const finish = () => {
    const s = getSession();
    if (s) setSession({ ...s, consented: true });
    router.replace(next);
  };

  useEffect(() => {
    if (session === null || (session && session.role !== "STUDENT")) {
      router.replace("/login");
      return;
    }
    if (!session || status) return;
    api<ConsentStatus>("/me/consent")
      .then((s) => (s.required ? setStatus(s) : finish()))
      .catch(setError);
    // finish는 매 렌더 새로 만들어지므로 세션이 정해질 때 한 번만 확인
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    setBusy(true);
    setError(null);
    try {
      await api("/me/consent", { method: "PUT", body: { version: status.version, terms, privacy } });
      finish();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const all = terms && privacy;
  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>서비스 이용 동의</h1>
        <p className="muted">모아과를 이용하려면 아래 필수 항목에 동의해 주세요.</p>
        {status ? (
          <form className="consent-form" onSubmit={submit}>
            <label className="consent-row all">
              <input type="checkbox" checked={all} onChange={(e) => { setTerms(e.target.checked); setPrivacy(e.target.checked); }} />
              <strong>모두 동의</strong>
            </label>
            <label className="consent-row">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <span>[필수] 이용약관 동의</span>
              <Link href="/terms" target="_blank">보기</Link>
            </label>
            <label className="consent-row">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
              <span>[필수] 개인정보 수집, 이용 동의</span>
              <Link href="/privacy" target="_blank">보기</Link>
            </label>
            <p className="hint">
              수집 항목: 소셜 로그인 식별자, 닉네임 등(자세한 항목은 처리방침). 목적: 회원 식별과 서비스 제공. 보유
              기간: 회원 탈퇴 시까지. 동의하지 않을 수 있으나 그러면 서비스를 이용할 수 없어요.
            </p>
            <InlineError error={error} />
            <button className="primary" disabled={!all || busy}>
              {busy ? "저장 중…" : "동의하고 시작하기"}
            </button>
            <button type="button" className="link-btn" onClick={() => logout().finally(() => router.replace("/login"))}>
              동의하지 않고 로그아웃
            </button>
          </form>
        ) : (
          <>{error ? <InlineError error={error} /> : <p role="status">확인 중입니다…</p>}</>
        )}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Consent />
    </Suspense>
  );
}
