"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { CorrectionField } from "@/types";

const FIELDS: [CorrectionField, string][] = [
  ["DEADLINE", "신청 마감"],
  ["EVENT", "행사 일시"],
];

/**
 * 크롤링 공지의 자동 추출 날짜가 원문과 다를 때 학생이 보내는 교정 요청.
 * 날짜를 비우고 메모만 남기면 "이 공지에는 해당 날짜가 없음"으로 접수된다.
 */
export default function DateCorrectionForm({ noticeId, open, onClose, initialField = "DEADLINE" }: { noticeId: number; open: boolean; onClose: () => void; initialField?: CorrectionField }) {
  const session = useSession();
  const toast = useToast();
  const [field, setField] = useState<CorrectionField>(initialField);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [memo, setMemo] = useState("");
  const [invalid, setInvalid] = useState<{ end?: string; form?: string }>({});

  const send = useMutation({
    mutationFn: () =>
      api<{ id: number }>(`/crawled-notices/${noticeId}/date-corrections`, {
        method: "POST",
        body: {
          field,
          suggestedStart: start || null,
          suggestedEnd: field === "EVENT" && end ? end : null,
          memo: memo.trim() || null,
        },
      }),
    onSuccess: () => {
      toast("교정 요청을 보냈어요. 운영자가 원문을 확인한 뒤 반영해요.");
      onClose();
      setStart("");
      setEnd("");
      setMemo("");
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof invalid = {};
    if (field === "EVENT" && end && (!start || end < start)) next.end = "종료일은 시작일과 같거나 이후로 골라 주세요.";
    if (!start && !memo.trim()) next.form = "올바른 날짜를 고르거나, 날짜가 없다면 메모를 남겨 주세요.";
    setInvalid(next);
    if (!next.end && !next.form) send.mutate();
  }

  if (!open) return null;

  if (session?.role !== "STUDENT") {
    return (
      <div className="correction-box">
        <p className="correction-hint">로그인하면 날짜 교정을 요청할 수 있어요.</p>
        <Link href="/login" className="secondary">
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <form className="correction-box" onSubmit={submit} noValidate>
      <p className="correction-hint">원문을 확인해 올바른 날짜를 알려 주세요. 운영자가 확인한 뒤 반영해요.</p>
      <div className="tabs" role="radiogroup" aria-label="교정할 항목">
        {FIELDS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={field === key}
            className={`tab ${field === key ? "on" : ""}`}
            onClick={() => {
              setField(key);
              setEnd("");
              setInvalid({});
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="form-group">
        <label htmlFor="correction-start">{field === "DEADLINE" ? "올바른 마감일" : "시작일"}</label>
        <input id="correction-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      {field === "EVENT" && (
        <div className="form-group">
          <label htmlFor="correction-end">종료일 (하루 행사면 비워 두세요)</label>
          <input
            id="correction-end"
            type="date"
            value={end}
            min={start || undefined}
            aria-invalid={!!invalid.end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <InlineError error={invalid.end} />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="correction-memo">메모 (선택)</label>
        <textarea
          id="correction-memo"
          rows={2}
          maxLength={300}
          value={memo}
          placeholder="예: 제목에 12/4까지로 적혀 있어요"
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>
      <div className="btn-row">
        <button type="submit" className="primary" disabled={send.isPending}>
          {send.isPending ? "보내는 중…" : "교정 요청 보내기"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            onClose();
            setInvalid({});
            send.reset();
          }}
        >
          취소
        </button>
      </div>
      <InlineError error={invalid.form ?? send.error} />
    </form>
  );
}
