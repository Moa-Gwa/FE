"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";

export default function AdminSetupPage() {
  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>관리자 비밀번호 설정</h1>
        {/* useSearchParams는 정적 빌드에서 Suspense 경계가 필요함 */}
        <Suspense fallback={<p className="muted">링크를 확인하는 중…</p>}>
          <SetupForm />
        </Suspense>
      </section>
    </main>
  );
}

function SetupForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [email, setEmail] = useState("");
  const [linkError, setLinkError] = useState(token ? "" : "설정 링크가 올바르지 않습니다.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api<{ email: string; valid: boolean }>("/admin/auth/setup/validate", {
      method: "POST",
      auth: false,
      body: { token },
    })
      .then((r) => (r.valid ? setEmail(r.email) : setLinkError("설정 링크가 만료되었습니다. 운영진에게 재발급을 요청해 주세요.")))
      .catch((e) => setLinkError((e as Error).message));
  }, [token]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const password = new FormData(e.currentTarget).get("password");
      await api("/admin/auth/setup", { method: "POST", auth: false, body: { token, password } });
      router.replace("/login?admin=1");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (linkError) return <InlineError error={linkError} />;

  return (
    <>
      <p>{email}</p>
      <form className="role-buttons" onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="password">새 비밀번호 (10자 이상)</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={10}
            maxLength={100}
            required
            autoComplete="new-password"
          />
        </div>
        <InlineError error={error} />
        <button className="primary" disabled={!email || busy}>
          {busy ? "저장 중…" : "비밀번호 설정"}
        </button>
      </form>
    </>
  );
}
