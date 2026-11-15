"use client";

import { useRef } from "react";
import type { ScheduleEntry } from "@/types";
import { scheduleKey, weekSegments } from "@/lib/calendarEvents";
import { colorText, scheduleColor } from "@/lib/scheduleColors";
import { kstDay } from "@/lib/format";

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
          return <div className="calendar-week" key={week}>
            {highlight >= 0 && <span className="calendar-day-highlight" aria-hidden="true" style={{ left: `${highlight * 100 / 7}%` }} />}
            <div className="calendar-grid calendar-week-days">{days.map((day, i) => day ? renderDay(day) : <div key={`blank-${i}`} />)}</div>
            <div className="calendar-week-bars">
              {segments.map(s => <button type="button" key={scheduleKey(s.entry)}
                className={`calendar-event-bar kind-${s.entry.type.toLowerCase()} ${s.before ? "continues-before" : ""} ${s.after ? "continues-after" : ""}`}
                style={{ gridColumn: `${s.start + 1} / span ${s.span}`, gridRow: s.lane + 1 }}
                title={s.entry.title} aria-label={`${s.entry.title} 일정 보기`}
                onClick={() => onEntrySelect?.(s.entry)}><span className="calendar-event-label" style={{ background: scheduleColor(s.entry), color: colorText(scheduleColor(s.entry)) }}>{s.entry.title}</span></button>)}
            </div>
          </div>;
        })}
      </div> : <div className="calendar-grid">{cells.map((day, i) => day ? renderDay(day) : <div key={`blank-${i}`} />)}</div>}

    </div>
  );
}
