"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import Calendar from "@/components/Calendar";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtTime, kstDay } from "@/lib/format";
import type { ScheduleEntry } from "@/types";

type Tab = "today" | "week" | "month";
const TABS: [Tab, string][] = [
  ["today", "오늘"],
  ["week", "이번 주"],
  ["month", "캘린더"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function EntryCard({ e }: { e: ScheduleEntry }) {
  return (
    <Link href={`/notices/${e.source.toLowerCase()}/${e.noticeId}`} className="notice-card compact">
      <div className="notice-card-top">
        <span className={`pill ${e.type === "DEADLINE" ? "pink" : ""}`}>
          {e.type === "DEADLINE" ? "마감" : "행사"} {fmtTime(e.at)}
        </span>
        <span className="tag">{e.organizationName}</span>
      </div>
      <h3>{e.title}</h3>
      {e.location && <p>{e.location}</p>}
    </Link>
  );
}

export default function SchedulePage() {
  const [tab, setTab] = useState<Tab>("today");
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(kstDay(now));

  const weekFrom = ymd(now);
  const weekTo = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6));
  const week = useQuery({
    queryKey: ["schedule", "week", weekFrom],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${weekFrom}&to=${weekTo}`, { auth: false }),
  });

  const monthFrom = `${cursor.year}-${pad(cursor.month + 1)}-01`;
  const monthTo = ymd(new Date(cursor.year, cursor.month + 1, 0));
  const month = useQuery({
    queryKey: ["schedule", "month", monthFrom],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${monthFrom}&to=${monthTo}`, { auth: false }),
    enabled: tab === "month",
  });

  const today = kstDay(now);
  const todayEntries = (week.data ?? []).filter((e) => kstDay(e.at) === today);
  const weekGroups = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();
    for (const e of week.data ?? []) {
      const d = kstDay(e.at);
      groups.set(d, [...(groups.get(d) ?? []), e]);
    }
    return [...groups.entries()];
  }, [week.data]);
  const marked = useMemo(() => new Set((month.data ?? []).map((e) => kstDay(e.at))), [month.data]);
  const selectedEntries = (month.data ?? []).filter((e) => kstDay(e.at) === selected);

  return (
    <>
      <TopBar title="일정" sub="행사·신청·마감 일정을 한눈에 확인하세요." />
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "today" &&
        (week.isPending ? (
          <div className="empty">불러오는 중…</div>
        ) : todayEntries.length ? (
          <div className="notice-list">{todayEntries.map((e) => <EntryCard key={`${e.type}-${e.source}-${e.noticeId}`} e={e} />)}</div>
        ) : (
          <div className="empty">오늘 예정된 일정이 없어요.</div>
        ))}

      {tab === "week" &&
        (week.isPending ? (
          <div className="empty">불러오는 중…</div>
        ) : weekGroups.length ? (
          <div className="stack">
            {weekGroups.map(([day, list]) => (
              <section key={day}>
                <div className="section-heading">
                  <h2>{day.slice(5).replace("-", "월 ")}일</h2>
                </div>
                <div className="notice-list">{list.map((e) => <EntryCard key={`${e.type}-${e.source}-${e.noticeId}`} e={e} />)}</div>
              </section>
            ))}
          </div>
        ) : (
          <div className="empty">이번 주 일정이 없어요.</div>
        ))}

      {tab === "month" && (
        <div className="grid two">
          <Calendar
            year={cursor.year}
            month={cursor.month}
            markedDays={marked}
            selected={selected}
            onSelect={setSelected}
            onMove={(d) => {
              const next = new Date(cursor.year, cursor.month + d, 1);
              setCursor({ year: next.getFullYear(), month: next.getMonth() });
              setSelected(null);
            }}
          />
          <div>
            <div className="section-heading">
              <h2>{selected ? `${selected.slice(5).replace("-", "월 ")}일 일정` : "날짜를 선택하세요"}</h2>
            </div>
            {selectedEntries.length ? (
              <div className="notice-list">{selectedEntries.map((e) => <EntryCard key={`${e.type}-${e.source}-${e.noticeId}`} e={e} />)}</div>
            ) : (
              <div className="empty">선택한 날짜에 일정이 없어요.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
