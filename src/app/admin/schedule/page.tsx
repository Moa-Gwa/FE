"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { AdminScheduleItem } from "@/types";

const TABS = [
  ["ALL", "전체"],
  ["PUBLISH", "게시 예정"],
  ["EVENT", "행사 일정"],
] as const;
const LABEL = { PUBLISH: "게시 예정", EVENT: "행사 시작", DEADLINE: "신청 마감" };

export default function AdminSchedulePage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("ALL");
  const query = useQuery({ queryKey: ["admin", "schedule"], queryFn: () => api<AdminScheduleItem[]>("/admin/schedule") });
  const items = (query.data ?? []).filter((i) => tab === "ALL" || (tab === "PUBLISH" ? i.type === "PUBLISH" : i.type !== "PUBLISH"));

  return (
    <>
      <TopBar title="일정" sub="게시 예정과 행사·마감 일정을 한눈에 확인하세요." />
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <div className="empty">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="empty">표시할 일정이 없어요.</div>
      ) : (
        <div className="notice-list">
          {items.map((i) => (
            <Link key={`${i.type}-${i.noticeId}`} href={`/admin/notices/${i.noticeId}/edit`} className="notice-card compact">
              <h3>{i.title}</h3>
              <p className="sched-meta">
                <b className={`type-${i.type.toLowerCase()}`}>{LABEL[i.type]}</b>
                <span>{fmtDateTime(i.at)}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
