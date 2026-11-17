"use client";

import { useEffect, useRef, useState } from "react";
import type { ScheduleEntry } from "@/types";
import { scheduleKey, weekSegments } from "@/lib/calendarEvents";
import { colorText, scheduleColor } from "@/lib/scheduleColors";
import { kstDay } from "@/lib/format";

/** 펼치지 않은 주에 보여 줄 일정 줄 수 */
const COMPACT_LANES = 2;
/** 두 번 누르기 판정(350ms)이 끝난 뒤 펼칠 주를 바꿔, 두 번째 누름 전에 날짜 칸이 움직이지 않게 함 */
const EXPAND_DELAY_MS = 400;

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Month grid with an indicator on days that have entries. `month` is 0-based. */
export default function Calendar({
  year,
  month,
  markedDays,
  selected,
  onSelect,
  onAdd,
  onMove,
  range,
  minDay,
  entries,
  onEntrySelect,
}: {
  entries?: ScheduleEntry[];
  onEntrySelect?: (entry: ScheduleEntry) => void;
  year: number;
  month: number;
  markedDays: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
  /** Double-click, touch double-tap, or Shift+Enter to add an entry. */
  onAdd?: (day: string) => void;
  onMove: (delta: number) => void;
  /** inclusive "YYYY-MM-DD" bounds to tint (e.g. this week) */
  range?: { from: string; to: string } | null;
  /** "YYYY-MM-DD": days before this are not selectable */
  minDay?: string;
}) {
  const pointerType = useRef("");
  const lastTap = useRef<{ day: string; at: number } | null>(null);
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const today = kstDay(new Date());
  const focusDay = selected ?? today;
  const [expandedDay, setExpandedDay] = useState(focusDay);
  useEffect(() => {
    const timer = setTimeout(() => setExpandedDay(focusDay), EXPAND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [focusDay]);
  const pad = (n: number) => String(n).padStart(2, "0");

  const cells: (string | null)[] = Array.from({ length: Math.ceil((first.getDay() + count) / 7) * 7 }, (_, i) => {
    const number = i - first.getDay() + 1;
    return number > 0 && number <= count ? `${year}-${pad(month + 1)}-${pad(number)}` : null;
  });
  const renderDay = (key: string) => {
    const number = Number(key.slice(8));
    const disabled = !!minDay && key < minDay;
    const inRange = !!range && key >= range.from && key <= range.to;
    const edge = inRange ? `${key === range!.from ? "range-start" : ""} ${key === range!.to ? "range-end" : ""}` : "";
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        aria-label={`${month + 1}월 ${number}일`}
        className={`day ${markedDays.has(key) ? "event" : ""} ${key === today ? "today" : ""} ${key === selected ? "selected" : ""} ${inRange ? "in-range" : ""} ${edge} ${disabled ? "disabled" : ""}`}
        aria-disabled={disabled || undefined}
        onPointerDown={(event) => { pointerType.current = event.pointerType; }}
        onClick={(event) => {
          if (disabled) return;
          onSelect(key);
          if (!onAdd || pointerType.current !== "touch" || event.detail === 0) return;
          const at = performance.now();
          const previous = lastTap.current;
          if (previous?.day === key && at - previous.at <= 350) {
            lastTap.current = null;
            onAdd(key);
          } else lastTap.current = { day: key, at };
        }}
        onDoubleClick={() => {
          if (!disabled && pointerType.current !== "touch") onAdd?.(key);
        }}
        onKeyDown={(e) => {
          if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          if (e.key === "Enter" && e.shiftKey && onAdd) onAdd(key);
          else onSelect(key);
        }}
      >
        <span className="day-num">{number}</span>
        {markedDays.has(key) && <i className="day-dot" aria-hidden="true" />}
      </div>
    );

  };
  return (
    <div className={`calendar ${entries ? "calendar-planner" : ""}`}>
      <div className="calendar-head">
        <button type="button" className="link-btn" aria-label="이전 달" onClick={() => onMove(-1)}>
          ‹
        </button>
        <strong>
          {year}년 {month + 1}월
        </strong>
        <button type="button" className="link-btn" aria-label="다음 달" onClick={() => onMove(1)}>
          ›
        </button>
      </div>
      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="day-name">{d}</div>)}
      </div>
      {entries ? <div className="calendar-period-grid">
        {Array.from({ length: cells.length / 7 }, (_, week) => {
          const days = cells.slice(week * 7, week * 7 + 7);
          const segments = weekSegments(entries, days);
          const highlight = days.indexOf(selected ?? today);
          // 선택한 날(없으면 오늘)이 있는 주만 펼치고(EXPAND_DELAY_MS 뒤), 나머지 주는 일정을 COMPACT_LANES줄까지만 보여 줌
          const expanded = days.includes(expandedDay);
          const shown = expanded ? segments : segments.filter(s => s.lane < COMPACT_LANES);
          const hidden = days.map((_, i) => segments.filter(s => s.lane >= COMPACT_LANES && s.start <= i && i < s.start + s.span).length);
          return <div className={`calendar-week ${expanded ? "expanded" : ""}`} key={week}>
            {highlight >= 0 && <span className="calendar-day-highlight" aria-hidden="true" style={{ left: `${highlight * 100 / 7}%` }} />}
            <div className="calendar-grid calendar-week-days">{days.map((day, i) => day ? renderDay(day) : <div key={`blank-${i}`} />)}</div>
            <div className="calendar-week-bars">
              {shown.map(s => <button type="button" key={scheduleKey(s.entry)}
                className={`calendar-event-bar kind-${s.entry.type.toLowerCase()} ${s.before ? "continues-before" : ""} ${s.after ? "continues-after" : ""}`}
                style={{ gridColumn: `${s.start + 1} / span ${s.span}`, gridRow: s.lane + 1 }}
                title={s.entry.title} aria-label={`${s.entry.title} 일정 보기`}
                onClick={() => onEntrySelect?.(s.entry)}><span className="calendar-event-label" style={{ background: scheduleColor(s.entry), color: colorText(scheduleColor(s.entry)) }}>{s.entry.title}</span></button>)}
              {!expanded && hidden.map((n, i) => n > 0 && <span key={`more-${i}`} className="calendar-more" style={{ gridColumn: i + 1, gridRow: COMPACT_LANES + 1 }}><span aria-hidden="true">+{n}</span><span className="sr-only">일정 {n}개 더 있음</span></span>)}
            </div>
          </div>;
        })}
      </div> : <div className="calendar-grid">{cells.map((day, i) => day ? renderDay(day) : <div key={`blank-${i}`} />)}</div>}

    </div>
  );
}
