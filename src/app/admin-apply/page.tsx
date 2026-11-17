"use client";

import Link from "next/link";
import { useState } from "react";
import InlineError from "@/components/InlineError";
import { api, ApiError } from "@/lib/api";

type Field = {
  name: string;
  label: string;
  max: number;
  type?: "text" | "email" | "tel" | "url";
  inputMode?: "text" | "email" | "tel" | "url";
  /** 서버 검증과 같은 형식. HTML pattern이라 전체 일치로 검사됨 */
  pattern?: string;
  placeholder?: string;
  /** 형식이 맞지 않을 때 안내. 서버 메시지와 같음 */
  hint?: string;
};

/** 길이와 형식은 서버 검증과 같음 */
const FIELDS: Field[] = [
  { name: "organizationName", label: "단체명", max: 100 },
  { name: "university", label: "소속 대학", max: 100 },
  { name: "department", label: "소속 학과", max: 100 },
  { name: "contactName", label: "담당자 이름", max: 50 },
  {
    name: "email",
    label: "학교 메일",
    max: 200,
    type: "email",
    inputMode: "email",
    pattern: "[^@\\s]+@catholic\\.ac\\.kr",
    placeholder: "example@catholic.ac.kr",
    hint: "학교 메일(@catholic.ac.kr)로 신청해 주세요.",
  },
  {
    name: "loginId",
    label: "로그인 아이디",
    max: 30,
    pattern: "[a-z0-9_\\-]{4,30}",
    placeholder: "영문 소문자, 숫자, -, _ 4~30자",
    hint: "아이디는 영문 소문자, 숫자, -, _로 4자 이상 30자 이하로 입력해 주세요.",
  },
  {
    name: "phone",
    label: "연락처",
    max: 13,
    type: "tel",
    inputMode: "tel",
    pattern: "0\\d{1,2}-?\\d{3,4}-?\\d{4}",
    placeholder: "010-1234-5678",
    hint: "전화번호 형식이 올바르지 않습니다. 예: 010-1234-5678",
  },
  {
    name: "channelUrl",
    label: "공식 채널 링크",
    max: 500,
    type: "url",
    inputMode: "url",
    pattern: "https?:\\/\\/[^\\s\\/?#]+\\S*",
    placeholder: "https://instagram.com/council",
    hint: "채널 주소는 http:// 또는 https://로 시작해야 합니다.",
  },
];

/** 브라우저 기본 검증 결과를 항목별 안내 문구로 바꿈 */
function invalidFields(form: HTMLFormElement): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || el.validity.valid) continue;
    errors[el.name] = el.validity.valueMissing
      ? el instanceof HTMLInputElement && el.type === "checkbox" ? "개인정보 수집, 이용에 동의해 주세요." : "입력해 주세요."
      : (FIELDS.find((f) => f.name === el.name)?.hint ?? el.validationMessage);
  }
  return errors;
}

export default function AdminApplyPage() {
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const invalid = invalidFields(form);
    setFieldErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const body = Object.fromEntries(new FormData(form));
      await api("/admin-applications", { method: "POST", auth: false, body });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
      } else if (err instanceof ApiError && err.status === 409) {
        // 이미 쓰는 아이디이거나 같은 메일로 접수된 신청이 있음
        setFieldErrors({ [err.message.includes("아이디") ? "loginId" : "email"]: err.message });
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  // 고친 항목의 안내는 바로 지움
  function clearFieldError(e: React.FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
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
          <form className="role-buttons" onSubmit={submit} onInput={clearFieldError} noValidate>
            {FIELDS.map(({ name, label, max, type = "text", hint, ...rest }) => (
              <div className="form-group" key={name}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  required
                  maxLength={max}
                  autoCapitalize={name === "loginId" ? "none" : undefined}
                  aria-invalid={!!fieldErrors[name]}
                  title={hint}
                  {...rest}
                />
                <InlineError error={fieldErrors[name]} />
              </div>
            ))}
            <div className="form-group">
              <label htmlFor="reason">신청 사유</label>
              <textarea
                id="reason"
                name="reason"
                required
                maxLength={3000}
                rows={4}
                aria-invalid={!!fieldErrors.reason}
              />
              <InlineError error={fieldErrors.reason} />
            </div>
            <div className="form-group">
              <label className="consent-row">
                <input type="checkbox" name="privacyAgreed" value="true" required aria-invalid={!!fieldErrors.privacyAgreed} />
                <span>[필수] 개인정보 수집, 이용 동의</span>
                <Link href="/privacy" target="_blank">보기</Link>
              </label>
              <p className="hint">
                담당자 이름, 학교 메일, 연락처를 신청 확인과 결과 안내에 써요. 반려된 신청은 30일, 승인된 신청은 1년 뒤
                삭제돼요.
              </p>
              <InlineError error={fieldErrors.privacyAgreed} />
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
