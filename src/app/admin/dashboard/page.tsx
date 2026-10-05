"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { dDay, fmtDateTime } from "@/lib/format";
import type { AdminDashboard } from "@/types";

export default function DashboardPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => api<AdminDashboard>("/admin/dashboard") });
  const close = useMutation({
    mutationFn: (id: number) => api<void>(`/admin/notices/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast("공지를 마감했어요.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast(e.message),
  });

  const d = query.data;
  const kpis: [string, number | undefined, string][] = [
    ["진행 중", d?.kpi.active, "/admin/notices?tab=active"],
    ["오늘 마감", d?.kpi.closingToday, "/admin/notices?tab=active"],
    ["예약", d?.kpi.scheduled, "/admin/notices?tab=scheduled"],
    ["종료", d?.kpi.ended, "/admin/notices?tab=closed"],
  ];

  return (
    <>
      <TopBar title="관리자 대시보드" sub={d ? `${d.organization.name} 공지 현황입니다.` : ""} />
      {query.isError && <div className="error">{(query.error as Error).message}</div>}

      <div className="grid stats">
        {kpis.map(([label, value, href]) => (
          <Link key={label} href={href} className="stat kpi-link">
            <span className="stat-label">{label}</span>
            <strong>{value ?? "–"}</strong>
          </Link>
        ))}
      </div>

      <section className="section hero" style={{ marginTop: 22 }}>
        <div className="eyebrow">NEW NOTICE</div>
        <h2>학생들에게 전할 새 소식이 있나요?</h2>
        <div className="btn-row" style={{ marginTop: 14, position: "relative" }}>
          <Link className="primary" href="/admin/notices/new">
            + 새 공지 작성
          </Link>
          <Link className="secondary" href="/admin/notices?tab=scheduled">
            예약 공지 확인
          </Link>
        </div>
      </section>

      <section className="section admin-layout">
        <div>
          <div className="section-heading">
            <h2>진행 중인 공지</h2>
            <Link href="/admin/notices" className="link-btn">
              전체 관리
            </Link>
          </div>
          {d && d.activeNotices.length === 0 && <div className="empty">진행 중인 공지가 없어요.</div>}
          <div className="notice-list">
            {d?.activeNotices.map((n) => (
              <article key={n.id} className="notice-card compact">
                <h3>{n.title}</h3>
                <div className="notice-meta">
                  {n.deadlineAt && (
                    <span className="deadline">
                      마감 {fmtDateTime(n.deadlineAt)} · {dDay(n.deadlineAt)}
                    </span>
                  )}
                  <span>조회 {n.viewCount}</span>
                  <span>저장 {n.bookmarkCount}</span>
                </div>
                <div className="actions" style={{ marginTop: 10 }}>
                  <Link href={`/admin/notices/${n.id}/edit`}>
                    <button>수정</button>
                  </Link>
                  <button onClick={() => close.mutate(n.id)}>마감 처리</button>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="insight">
          <div className="eyebrow">PERFORMANCE</div>
          <h3>전달 성과</h3>
          <div className="bars">
            {d &&
              (
                [
                  ["공지 수", d.performance.notices],
                  ["조회", d.performance.views],
                  ["저장", d.performance.bookmarks],
                  ["공유", d.performance.shares],
                ] as const
              ).map(([label, value]) => (
                <div className="bar-row" key={label} style={{ gridTemplateColumns: "60px 1fr" }}>
                  <span>{label}</span>
                  <b>{value.toLocaleString()}</b>
                </div>
              ))}
          </div>
        </aside>
      </section>
    </>
  );
}
