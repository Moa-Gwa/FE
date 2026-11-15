"use client";

import { useRef } from "react";
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
}: {
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
              <span className="day-num">{i + 1}</span>
              {markedDays.has(key) && <i className="day-dot" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
