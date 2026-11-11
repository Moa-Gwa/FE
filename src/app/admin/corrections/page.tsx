"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import DateTimeField from "@/components/DateTimeField";
import InlineError, { latestError } from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtDate, fmtDateTime, fromLocalInput, toLocalInput } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { CorrectionStatus, DateCorrection } from "@/types";

const TABS: [CorrectionStatus, string][] = [
  ["PENDING", "검토 대기"],
  ["APPLIED", "반영함"],
  ["REJECTED", "반려함"],
];

const FIELD_LABEL = { DEADLINE: "신청 마감", EVENT: "행사 일시" } as const;

export default function CorrectionsPage() {
  const session = useSession();
  const [tab, setTab] = useState<CorrectionStatus>("PENDING");
  const operator = !!session?.operator;
  const query = useQuery({
    queryKey: ["admin", "date-corrections", tab],
    queryFn: () => api<DateCorrection[]>(`/admin/date-corrections?status=${tab}`),
    enabled: operator,
  });

  if (session && !operator) {
    return (
      <>
        <TopBar title="날짜 교정" />
        <div className="empty">서비스 운영자만 볼 수 있는 화면이에요.</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="날짜 교정" sub="학생이 보낸 크롤링 공지 날짜 교정 요청을 원문과 비교해 반영해요." />
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {query.isPending && <div className="empty">불러오는 중…</div>}
      {query.isError && <InlineError error={query.error} />}
      {query.data?.length === 0 && <div className="empty">해당하는 요청이 없어요.</div>}
      <div className="correction-list">
        {query.data?.map((c) => <CorrectionCard key={c.id} correction={c} />)}
      </div>
    </>
  );
}

function suggestionText(c: DateCorrection) {
  if (!c.suggestedStart) return "날짜 없음";
  return c.suggestedEnd && c.suggestedEnd !== c.suggestedStart
    ? `${fmtDate(c.suggestedStart)} ~ ${fmtDate(c.suggestedEnd)}`
    : fmtDate(c.suggestedStart);
}

function currentText(c: DateCorrection) {
  const n = c.notice;
  if (c.field === "DEADLINE") return n.deadlineAt ? fmtDateTime(n.deadlineAt) : "없음";
  if (!n.eventStartAt) return "없음";
  return n.eventEndAt ? `${fmtDateTime(n.eventStartAt)} ~ ${fmtDateTime(n.eventEndAt)}` : fmtDateTime(n.eventStartAt);
}

/** 학생 제안을 기본값으로 채움. 시각이 없는 마감은 서버 추출과 같은 18:00 */
function initialValues(c: DateCorrection) {
  if (c.field === "DEADLINE") {
    return { start: c.suggestedStart ? `${c.suggestedStart}T18:00` : toLocalInput(c.notice.deadlineAt), end: "" };
  }
  return {
    start: c.suggestedStart ? `${c.suggestedStart}T00:00` : toLocalInput(c.notice.eventStartAt),
    // 시작일만 제안하면 하루짜리 행사라 기존 종료일은 쓰지 않음
    end: c.suggestedEnd ? `${c.suggestedEnd}T23:59` : c.suggestedStart ? "" : toLocalInput(c.notice.eventEndAt),
  };
}

function CorrectionCard({ correction: c }: { correction: DateCorrection }) {
  const qc = useQueryClient();
  const toast = useToast();
  const initial = initialValues(c);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [none, setNone] = useState(!c.suggestedStart);
  const [invalid, setInvalid] = useState<string | null>(null);
  const pending = c.status === "PENDING";

  const done = (message: string) => {
    toast(message);
    qc.invalidateQueries({ queryKey: ["admin", "date-corrections"] });
    qc.invalidateQueries({ queryKey: ["notice"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const apply = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      api<void>(`/admin/date-corrections/${c.id}/apply`, { method: "POST", body }),
    onSuccess: () => done("교정한 날짜를 반영했어요."),
  });
  const reject = useMutation({
    mutationFn: () => api<void>(`/admin/date-corrections/${c.id}/reject`, { method: "POST" }),
    onSuccess: () => done("요청을 반려했어요."),
  });

  function submitApply() {
    setInvalid(null);
    if (none) {
      apply.mutate(c.field === "DEADLINE" ? { deadlineAt: null } : { eventStartAt: null, eventEndAt: null });
      return;
    }
    if (!start) {
      setInvalid(c.field === "DEADLINE" ? "마감 일시를 골라 주세요." : "시작 일시를 골라 주세요.");
      return;
    }
    if (c.field === "DEADLINE") {
      apply.mutate({ deadlineAt: fromLocalInput(start) });
      return;
    }
    if (end && end < start) {
      setInvalid("종료 일시는 시작 일시와 같거나 이후로 골라 주세요.");
      return;
    }
    // 종료가 비어 있으면 시작일 하루짜리 행사로 저장(진행 중 표시가 끝나도록)
    const endValue = end || `${start.slice(0, 10)}T23:59`;
    apply.mutate({ eventStartAt: fromLocalInput(start), eventEndAt: fromLocalInput(endValue) });
  }

  const busy = apply.isPending || reject.isPending;
  const error = invalid ?? latestError(apply, reject);

  return (
    <article className="form-card correction-card">
      <header>
        <span className="tag-list">
          <span>{FIELD_LABEL[c.field]}</span>
        </span>
        <span className="correction-date">요청 {fmtDateTime(c.createdAt)}</span>
      </header>
      <h3>
        <a href={c.notice.url} target="_blank" rel="noopener noreferrer">
          {c.notice.title} ↗
        </a>
      </h3>
      <dl className="info-grid">
        <dt>현재 값</dt>
        <dd>{currentText(c)}</dd>
        <dt>학생 제안</dt>
        <dd>{suggestionText(c)}</dd>
        {c.memo && (
          <>
            <dt>메모</dt>
            <dd>{c.memo}</dd>
          </>
        )}
        <dt>원문 근거</dt>
        <dd>{c.notice.dateEvidence ?? "없음"}</dd>
      </dl>
      {c.notice.contentText && (
        <details className="correction-source">
          <summary>공지 본문 보기</summary>
          <p>{c.notice.contentText}</p>
        </details>
      )}

      {pending && (
        <div className="correction-apply">
          <label className="check">
            <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} />
            {c.field === "DEADLINE" ? "이 공지에는 신청 마감이 없어요" : "이 공지에는 행사 일시가 없어요"}
          </label>
          {!none && (
            <div className="correction-fields">
              <DateTimeField
                value={start}
                onChange={setStart}
                ariaLabel={c.field === "DEADLINE" ? "마감 일시" : "시작 일시"}
                placeholder={c.field === "DEADLINE" ? "마감 일시" : "시작 일시"}
              />
              {c.field === "EVENT" && (
                <DateTimeField value={end} onChange={setEnd} min={start} ariaLabel="종료 일시" placeholder="종료 일시 (선택)" />
              )}
            </div>
          )}
          <div className="btn-row">
            <button className="primary" disabled={busy} onClick={submitApply}>
              반영하기
            </button>
            <button className="secondary" disabled={busy} onClick={() => reject.mutate()}>
              반려하기
            </button>
          </div>
          <InlineError error={error} />
        </div>
      )}
    </article>
  );
}
