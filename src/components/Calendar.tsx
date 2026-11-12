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
}: {
  year: number;
  month: number;
  markedDays: Set<string>;
  selected: string | null;
  onSelect: (day: string) => void;
  onMove: (delta: number) => void;
}) {
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const today = kstDay(new Date());
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="link-btn" aria-label="이전 달" onClick={() => onMove(-1)}>
          ‹
        </button>
        <strong>
          {year}년 {month + 1}월
        </strong>
        <button className="link-btn" aria-label="다음 달" onClick={() => onMove(1)}>
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
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${month + 1}월 ${i + 1}일`}
              className={`day ${markedDays.has(key) ? "event" : ""} ${key === today ? "today" : ""} ${key === selected ? "selected" : ""}`}
              onClick={() => onSelect(key)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(key)}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
