"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import InlineError from "@/components/InlineError";
import Badge from "@/components/Badge";
import Calendar from "@/components/Calendar";
import Icon from "@/components/Icon";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtTime, kstDay } from "@/lib/format";
import { useSession } from "@/lib/session";
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
const onlyBookmarked = (list: ScheduleEntry[] | undefined, on: boolean) =>
  (list ?? []).filter((e) => !on || e.bookmarked);
const entryKey = (e: ScheduleEntry) => `${e.type}-${e.source}-${e.noticeId}-${e.at}`;

function EntryRow({ e }: { e: ScheduleEntry }) {
  const deadline = e.type === "DEADLINE";
  return (
    <Link href={`/notices/${e.source.toLowerCase()}/${e.noticeId}`} className="notice-card sched-row">
      <span className="sched-time">{fmtTime(e.at)}</span>
      <div className="nc-body">
        <h3>
          {e.bookmarked && (
            <span className="sched-saved" title="저장한 공지">
              <Icon name="bookmark" />
              <span className="sr-only">저장한 공지</span>
            </span>
          )}
          {e.title}
        </h3>
        <div className="nc-meta">
          <Badge color={deadline ? "yellow" : "elephant"}>{deadline ? "마감" : "행사"}</Badge>
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
  const [savedOnly, setSavedOnly] = useState(false);
  // 저장한 공지가 일정에 포함되므로 계정별로 캐시를 나눔(다른 계정의 저장 표시 노출 방지)
  const session = useSession();
  const isStudent = session?.role === "STUDENT";
  const viewer = isStudent ? `student:${session.name}` : "guest";
  const onlySaved = isStudent && savedOnly;

  const week = useQuery({
    queryKey: ["schedule", "week", weekFrom, viewer],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${weekFrom}&to=${weekTo}`, { auth: false }),
  });
  const monthFrom = `${cursor.year}-${pad(cursor.month + 1)}-01`;
  const monthTo = ymd(new Date(cursor.year, cursor.month + 1, 0));
  const month = useQuery({
    queryKey: ["schedule", "month", monthFrom, viewer],
    queryFn: () => api<ScheduleEntry[]>(`/schedule?from=${monthFrom}&to=${monthTo}`, { auth: false }),
  });

  const monthEntries = useMemo(() => onlyBookmarked(month.data, onlySaved), [month.data, onlySaved]);
  const weekEntries = useMemo(() => onlyBookmarked(week.data, onlySaved), [week.data, onlySaved]);

  const marked = useMemo(() => new Set(monthEntries.map((e) => kstDay(e.at))), [monthEntries]);
  const weekGroups = useMemo(() => {
    const groups = new Map<string, ScheduleEntry[]>();
    for (const e of weekEntries) {
      const d = kstDay(e.at);
      groups.set(d, [...(groups.get(d) ?? []), e]);
    }
    // today first, then the rest of the week in date order
    return [...groups.entries()].sort(([a], [b]) => (a === today ? -1 : b === today ? 1 : a.localeCompare(b)));
  }, [weekEntries, today]);

  const pick = (m: Mode) => {
    setMode(m);
    setSelected(m === "today" ? today : null);
    if (m !== "day") setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  let body: React.ReactNode;
  if (mode === "week") {
    body = week.isPending ? (
      <div className="empty">불러오는 중…</div>
    ) : week.isError ? (
      <InlineError error={week.error} />
    ) : weekGroups.length ? (
      weekGroups.map(([day, list]) => <DayGroup key={day} day={day} list={list} today={today} />)
    ) : (
      <div className="empty">{onlySaved ? "이번 주에 저장한 공지 일정이 없어요." : "이번 주 일정이 없어요."}</div>
    );
  } else {
    const day = mode === "today" ? today : selected!;
    const source = mode === "today" ? week : month;
    const list = (mode === "today" ? weekEntries : monthEntries).filter((e) => kstDay(e.at) === day);
    body = source.isPending ? (
      <div className="empty">불러오는 중…</div>
    ) : source.isError ? (
      <InlineError error={source.error} />
    ) : list.length ? (
      <DayGroup day={day} list={list} today={today} />
    ) : (
      <div className="empty">{mode === "today" ? "오늘 예정된 일정이 없어요." : "선택한 날짜에 일정이 없어요."}</div>
    );
  }

  return (
    <>
      <TopBar title="일정" sub="행사·신청·마감 일정과 저장한 공지의 날짜를 한눈에 확인하세요." />

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
          {isStudent && (
            <button
              className={`sched-filter ${savedOnly ? "on" : ""}`}
              aria-pressed={savedOnly}
              onClick={() => setSavedOnly((v) => !v)}
            >
              저장한 공지만
            </button>
          )}
        </nav>
        {body}
      </section>
    </>
  );
}
