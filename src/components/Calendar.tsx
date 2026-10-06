"use client";

import { kstDay } from "@/lib/format";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Month grid with an indicator on days that have entries. `month` is 0-based. */
export default function Calendar({
  year,
  month,
  markedDays,
  selected,
  onSelect,
  onMove,
  range,
  minDay,
}: {
  year: number;
  month: number;
  markedDays: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
  onMove: (delta: number) => void;
  /** inclusive "YYYY-MM-DD" bounds to tint (e.g. this week) */
  range?: { from: string; to: string } | null;
  /** "YYYY-MM-DD": days before this are not selectable */
  minDay?: string;
}) {
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const today = kstDay(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="calendar">
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
        {DAYS.map((d) => (
          <div key={d} className="day-name">
            {d}
          </div>
        ))}
        {Array.from({ length: first.getDay() }, (_, i) => (
          <div key={`b${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = `${year}-${pad(month + 1)}-${pad(i + 1)}`;
          const disabled = !!minDay && key < minDay;
          const inRange = !!range && key >= range.from && key <= range.to;
          const edge = inRange ? `${key === range!.from ? "range-start" : ""} ${key === range!.to ? "range-end" : ""}` : "";
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${month + 1}월 ${i + 1}일`}
              className={`day ${markedDays.has(key) ? "event" : ""} ${key === today ? "today" : ""} ${key === selected ? "selected" : ""} ${inRange ? "in-range" : ""} ${edge} ${disabled ? "disabled" : ""}`}
              aria-disabled={disabled || undefined}
              onClick={() => !disabled && onSelect(key)}
              onKeyDown={(e) => !disabled && (e.key === "Enter" || e.key === " ") && onSelect(key)}
            >
              <span className="day-num">{i + 1}</span>
              {markedDays.has(key) && <i className="day-dot" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
