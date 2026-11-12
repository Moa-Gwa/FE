"use client";

import Link from "next/link";
import { useState } from "react";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";

/** [name, 라벨, input type, 최대 길이]. 길이는 서버 검증과 같음 */
const FIELDS = [
  ["organizationName", "단체명", "text", 100],
  ["university", "소속 대학", "text", 100],
  ["department", "소속 학과", "text", 100],
  ["contactName", "담당자 이름", "text", 50],
  ["email", "학교 메일", "email", 200],
  ["phone", "연락처", "tel", 40],
  ["channelUrl", "공식 채널 링크", "url", 500],
] as const;

export default function AdminApplyPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      await api("/admin-applications", { method: "POST", auth: false, body });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>단체 관리자 신청</h1>
        <p className="muted">신청 내용을 확인한 뒤 이메일로 결과를 안내해 드려요.</p>
        {done ? (
          <>
            <p>신청이 접수됐어요. 검토 후 안내 메일을 보내드립니다.</p>
            <Link className="secondary" href="/login">
              로그인으로
            </Link>
          </>
        ) : (
          <form className="role-buttons" onSubmit={submit}>
            {FIELDS.map(([name, label, type, max]) => (
              <div className="form-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <input id={name} name={name} type={type} required maxLength={max} />
              </div>
            ))}
            <div className="form-group">
              <label htmlFor="reason">신청 사유</label>
              <textarea id="reason" name="reason" required maxLength={3000} rows={4} />
            </div>
            <InlineError error={error} />
            <button className="primary" disabled={busy}>
              {busy ? "보내는 중…" : "신청하기"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
