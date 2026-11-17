"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import InlineError, { latestError } from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { AdminApplication, AdminApplicationStatus, SetupLinkIssued } from "@/types";

const TABS: [AdminApplicationStatus, string][] = [
  ["PENDING", "검토 대기"],
  ["APPROVED", "승인함"],
  ["REJECTED", "반려함"],
];

export default function AdminApplicationsPage() {
  const session = useSession();
  const [tab, setTab] = useState<AdminApplicationStatus>("PENDING");
  // 메일 설정이 없는 환경에서만 채워지는 설정 링크
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const operator = !!session?.operator;
  const query = useQuery({
    queryKey: ["admin", "applications", tab],
    queryFn: () => api<AdminApplication[]>(`/admin/applications?status=${tab}`),
    enabled: operator,
  });

  if (session && !operator) {
    return (
      <>
        <TopBar title="단체 관리자 신청" />
        <div className="empty">서비스 운영자만 볼 수 있는 화면이에요.</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="단체 관리자 신청" sub="신청 정보를 확인하고 승인 또는 반려해요." />
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {setupLink && (
        <div className="empty">
          메일 설정이 없어 링크를 직접 전달해 주세요: <a href={setupLink}>{setupLink}</a>
        </div>
      )}
      {query.isPending && <div className="empty">불러오는 중…</div>}
      {query.isError && <InlineError error={query.error} />}
      {query.data?.length === 0 && <div className="empty">해당하는 신청이 없어요.</div>}
      <div className="correction-list">
        {query.data?.map((a) => (
          <ApplicationCard key={a.id} application={a} onLinkIssued={setSetupLink} />
        ))}
      </div>
    </>
  );
}

function ApplicationCard({
  application: a,
  onLinkIssued,
}: {
  application: AdminApplication;
  onLinkIssued: (link: string | null) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [name, setName] = useState(a.organizationName);

  const issued = (r: SetupLinkIssued, message: string) => {
    onLinkIssued(r.setupLink);
    if (r.mailSent) toast(message);
    qc.invalidateQueries({ queryKey: ["admin", "applications"] });
  };

  const approve = useMutation({
    mutationFn: () =>
      api<SetupLinkIssued>(`/admin/applications/${a.id}/approve`, { method: "POST", body: { organizationName: name.trim() || null } }),
    onSuccess: (r) => issued(r, "승인하고 설정 링크를 메일로 보냈어요."),
  });
  const resend = useMutation({
    mutationFn: () => api<SetupLinkIssued>(`/admin/applications/${a.id}/resend-setup`, { method: "POST" }),
    onSuccess: (r) => issued(r, "설정 링크를 다시 보냈어요."),
  });
  const reject = useMutation({
    mutationFn: () =>
      api<{ mailSent: boolean }>(`/admin/applications/${a.id}/reject`, {
        method: "POST",
        body: { reason: reason.trim() || null },
      }),
    onSuccess: (r) => {
      toast(r.mailSent ? "신청을 반려하고 안내 메일을 보냈어요." : "신청을 반려했어요. 안내 메일은 보내지 못했어요.");
      qc.invalidateQueries({ queryKey: ["admin", "applications"] });
    },
  });
  const busy = approve.isPending || resend.isPending || reject.isPending;

  return (
    <article className="correction-card notice-card">
      <h2>{a.organizationName}</h2>
      <p>
        {a.university} · {a.department}
      </p>
      <p>
        담당자: {a.contactName} · {a.email} · {a.phone}
      </p>
      <p>신청 아이디: {a.loginId}</p>
      <p>
        공식 채널:{" "}
        <a href={a.channelUrl} target="_blank" rel="noreferrer">
          {a.channelUrl}
        </a>
      </p>
      <p>신청 사유: {a.reason}</p>
      <p className="muted">신청일: {fmtDateTime(a.createdAt)}</p>
      {a.rejectionReason && <p>반려 사유: {a.rejectionReason}</p>}

      {a.status === "PENDING" && (
        <>
          <div className="form-group">
            <label htmlFor={`name-${a.id}`}>승인할 단체 이름</label>
            <input id={`name-${a.id}`} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <span className="hint">학과 학생회는 &quot;학과명 학생회&quot;(예: 철학과 학생회)로 맞추면 학생 관심정보에 학과와 함께 자동 등록돼요.</span>
          </div>
          <div className="form-group">
            <label htmlFor={`reason-${a.id}`}>반려 사유 (선택)</label>
            <input id={`reason-${a.id}`} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="btn-row">
            <button className="primary" disabled={busy} onClick={() => approve.mutate()}>
              승인하고 링크 발송
            </button>
            <button className="secondary" disabled={busy} onClick={() => reject.mutate()}>
              반려
            </button>
          </div>
        </>
      )}
      {a.status === "APPROVED" && (
        <div className="btn-row">
          <button className="secondary" disabled={busy} onClick={() => resend.mutate()}>
            설정 링크 재발급
          </button>
        </div>
      )}
      <InlineError error={latestError(approve, resend, reject)} />
    </article>
  );
}
