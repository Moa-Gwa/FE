"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/api";
import { setSession, useSession } from "@/lib/session";

const DOMAIN = "catholic.ac.kr";

export default function VerifyPage() {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const email = `${id.trim()}@${DOMAIN}`;
  const send = useMutation({
    mutationFn: () =>
      api<{ expiresInSeconds: number; devCode?: string }>("/me/verification/email", { method: "POST", body: { email } }),
    onSuccess: (res) => {
      setError("");
      setStep(2);
      setCode("");
      setDevCode(res.devCode ?? "");
      setExpiresAt(Date.now() + res.expiresInSeconds * 1000);
      setLeft(res.expiresInSeconds);
    },
    onError: (e) => setError(e.message),
  });
  const confirm = useMutation({
    mutationFn: () => api<{ verified: boolean; token: string }>("/me/verification/confirm", { method: "POST", body: { code } }),
    onSuccess: (res) => {
      if (session) setSession({ ...session, token: res.token, verified: true });
      setError("");
      setStep(3);
    },
    onError: (e) => setError(e.message),
  });

  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;

  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>재학생 인증</h1>
      </div>

      {step === 3 ? (
        <div className="life-card life-done">
          <span className="life-done-badge">
            <Icon name="check" size={36} />
          </span>
          <h2>재학생 인증이 끝났어요</h2>
          <p>이제 생활 탭에서 중고거래와 같이 사기를 이용할 수 있어요.</p>
          <span className="life-verified big">
            <Icon name="shield" size={14} />
            인증 완료 · {id.slice(0, 3)}***@{DOMAIN}
          </span>
          <Link href="/life" className="life-btn">
            생활 둘러보기
          </Link>
          <Link href="/home" className="life-btn ghost">
            홈으로
          </Link>
        </div>
      ) : (
        <>
          <div className="life-card">
            <span className="life-gate-badge">
              <Icon name="shield" size={26} />
            </span>
            <h2 className="life-title">{step === 1 ? "생활거래는 재학생끼리만\n이용할 수 있어요" : "메일로 받은\n6자리 코드를 입력해 주세요"}</h2>
            <div className="life-steps">
              <span className={step === 1 ? "on" : ""}>1 학교 메일</span>
              <span className={step === 2 ? "on" : ""}>2 코드 확인</span>
            </div>

            {step === 1 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
              >
                <label className="life-label" htmlFor="school-id">
                  학교 메일
                </label>
                <div className="life-field">
                  <Icon name="mail" size={20} />
                  <input
                    id="school-id"
                    value={id}
                    onChange={(e) => setId(e.target.value.replace(/[^A-Za-z0-9._-]/g, ""))}
                    placeholder="학번 또는 메일 아이디"
                    autoComplete="username"
                    inputMode="email"
                  />
                  <span>@{DOMAIN}</span>
                </div>
                <p className="life-note">
                  <Icon name="clock" size={14} /> 인증 코드는 받은 뒤 10분 동안 유효해요.
                </p>
                {error && <p className="error">{error}</p>}
                <button className="life-btn" disabled={!id.trim() || send.isPending}>
                  {send.isPending ? "보내는 중…" : "인증 코드 받기"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  confirm.mutate();
                }}
              >
                <p className="life-sub">
                  {id.slice(0, 3)}***@{DOMAIN} 로 보냈어요.
                </p>
                <input
                  className="life-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  aria-label="인증 코드 6자리"
                />
                <p className="life-note">
                  <Icon name="clock" size={14} /> {left > 0 ? `${mmss} 남음` : "코드가 만료됐어요"}
                </p>
                {devCode && <p className="life-note dev">시연용 코드: {devCode}</p>}
                {error && <p className="error">{error}</p>}
                <button className="life-btn" disabled={code.length !== 6 || confirm.isPending}>
                  {confirm.isPending ? "확인 중…" : "인증하기"}
                </button>
                <button type="button" className="life-btn ghost" onClick={() => send.mutate()} disabled={send.isPending}>
                  코드 다시 받기
                </button>
              </form>
            )}
          </div>
          <p className="life-callout" onClick={() => toast("공지, 북마크, 알림은 인증 없이 쓸 수 있어요.")}>
            <Icon name="check" size={14} /> 공지 보기, 북마크, 알림은 인증 없이 지금처럼 쓸 수 있어요. 생활 탭만 인증이 필요해요.
          </p>
        </>
      )}
    </>
  );
}
