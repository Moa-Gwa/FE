"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import Calendar from "@/components/Calendar";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtTime, kstDay } from "@/lib/format";
import type { ScheduleEntry } from "@/types";

/** "today" / "week" are the filters; "day" means a date was picked on the calendar. */
type Mode = "today" | "week" | "day";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const dayLabel = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAY[new Date(y, m - 1, d).getDay()]})`;
};
const entryKey = (e: ScheduleEntry) => `${e.type}-${e.source}-${e.noticeId}-${e.at}`;

function EntryRow({ e }: { e: ScheduleEntry }) {
  const deadline = e.type === "DEADLINE";
  return (
    <Link href={`/notices/${e.source.toLowerCase()}/${e.noticeId}`} className="notice-card sched-row">
      <span className="sched-time">{fmtTime(e.at)}</span>
      <div className="nc-body">
        <h3>{e.title}</h3>
        <div className="nc-meta">
          <span className={`pill ${deadline ? "hot" : ""}`}>{deadline ? "마감" : "행사"}</span>
          <span className="nc-sub">{[e.organizationName, e.location].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
    </Link>
  );
}

function DayGroup({ day, list, today }: { day: string; list: ScheduleEntry[]; today: string }) {
  return (
    <div className="sched-group">
      <h3 className="sched-day">
        {day === today && <em>오늘</em>}
        {dayLabel(day)}
      </h3>
      <div className="notice-list">
        {list.map((e) => (
          <EntryRow key={entryKey(e)} e={e} />
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const now = new Date();
  const today = kstDay(now);
  const weekFrom = ymd(now);
  const weekTo = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6));

  const [mode, setMode] = useState<Mode>("week");
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const week = useQuery({
    queryKey: ["schedule", "week", weekFrom],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${weekFrom}&to=${weekTo}`, { auth: false }),
  });
  const monthFrom = `${cursor.year}-${pad(cursor.month + 1)}-01`;
  const monthTo = ymd(new Date(cursor.year, cursor.month + 1, 0));
  const month = useQuery({
    queryKey: ["schedule", "month", monthFrom],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${monthFrom}&to=${monthTo}`, { auth: false }),
  });

  const marked = useMemo(() => new Set((month.data ?? []).map((e) => kstDay(e.at))), [month.data]);
  const weekGroups = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();
    for (const e of week.data ?? []) {
      const d = kstDay(e.at);
      groups.set(d, [...(groups.get(d) ?? []), e]);
    }
    // today first, then the rest of the week in date order
    return [...groups.entries()].sort(([a], [b]) => (a === today ? -1 : b === today ? 1 : a.localeCompare(b)));
  }, [week.data, today]);

  const pick = (m: Mode) => {
    setMode(m);
    setSelected(m === "today" ? today : null);
    if (m !== "day") setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  let body: React.ReactNode;
  if (mode === "week") {
    body = week.isPending ? (
      <div className="empty">불러오는 중…</div>
    ) : weekGroups.length ? (
      weekGroups.map(([day, list]) => <DayGroup key={day} day={day} list={list} today={today} />)
    ) : (
      <div className="empty">이번 주 일정이 없어요.</div>
    );
  } else {
    const day = mode === "today" ? today : selected!;
    const source = mode === "today" ? week : month;
    const list = (source.data ?? []).filter((e) => kstDay(e.at) === day);
    body = source.isPending ? (
      <div className="empty">불러오는 중…</div>
    ) : list.length ? (
      <DayGroup day={day} list={list} today={today} />
    ) : (
      <div className="empty">{mode === "today" ? "오늘 예정된 일정이 없어요." : "선택한 날짜에 일정이 없어요."}</div>
    );
  }

  return (
    <>
      <TopBar title="일정" sub="행사·신청·마감 일정을 한눈에 확인하세요." />

      <section className="section sched-cal">
        <Calendar
          year={cursor.year}
          month={cursor.month}
          markedDays={marked}
          selected={mode === "week" ? null : mode === "today" ? today : selected}
          range={mode === "week" ? { from: weekFrom, to: weekTo } : null}
          onSelect={(d) => {
            setMode(d === today ? "today" : "day");
            setSelected(d);
          }}
          onMove={(d) => {
            const next = new Date(cursor.year, cursor.month + d, 1);
            setCursor({ year: next.getFullYear(), month: next.getMonth() });
          }}
        />
      </section>

      <section className="section sched-list">
        <nav className="segmented" aria-label="일정 범위">
          <button className={mode === "today" ? "on" : ""} aria-pressed={mode === "today"} onClick={() => pick("today")}>
            오늘
          </button>
          <button className={mode === "week" ? "on" : ""} aria-pressed={mode === "week"} onClick={() => pick("week")}>
            이번 주
          </button>
          {mode === "day" && selected && (
            <button className="on" aria-pressed="true">
              {dayLabel(selected)}
            </button>
          )}
        </nav>
        {body}
      </section>
    </>
  );
}
