"use client";

import { useEffect, useRef } from "react";

const ROW_HEIGHT = 40;
const pad = (n: number) => String(n).padStart(2, "0");
const numbers = (start: number, count: number) => Array.from({ length: count }, (_, i) => start + i);

function Wheel({ label, values, value, onChange, disabled }: {
  label: string; values: number[]; value: number; onChange: (value: number) => void; disabled: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = Math.max(0, values.indexOf(value));
  useEffect(() => {
    // The parent dialog opens after mount; position the wheels once it is visible.
    const frame = requestAnimationFrame(() => {
      const element = list.current;
      if (element && Math.abs(element.scrollTop - index * ROW_HEIGHT) > 1) element.scrollTop = index * ROW_HEIGHT;
    });
    return () => cancelAnimationFrame(frame);
  }, [index]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <div className="wheel-column">
    <span className="wheel-label">{label}</span>
    <div className="wheel-window">
      <div className="wheel-selection" aria-hidden="true" />
      <div ref={list} className="wheel-list" role="listbox" aria-label={label} aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0} aria-activedescendant={`wheel-${label}-${value}`}
        onKeyDown={(e) => {
          if (disabled) return;
          let next = index;
          if (e.key === "ArrowDown") next++;
          else if (e.key === "ArrowUp") next--;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = values.length - 1;
          else return;
          e.preventDefault();
          onChange(values[Math.max(0, Math.min(values.length - 1, next))]);
        }}
        onScroll={() => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (!list.current || disabled) return;
            const next = Math.max(0, Math.min(values.length - 1, Math.round(list.current.scrollTop / ROW_HEIGHT)));
            if (values[next] !== value) onChange(values[next]);
          }, 120);
        }}>
        {values.map((item) => <button key={item} id={`wheel-${label}-${item}`} type="button" role="option"
          aria-selected={item === value} tabIndex={-1} disabled={disabled}
          className={item === value ? "selected" : ""} onClick={() => onChange(item)}>
          {label === "년" ? item : pad(item)}
        </button>)}
      </div>
    </div>
  </div>;
}

export default function WheelDateTimePicker({ value, onChange, disabled = false, timeOnly = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; timeOnly?: boolean;
}) {
  const [date, time] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const currentYear = new Date().getFullYear();
  const firstYear = currentYear;
  const lastYear = Math.max(currentYear + 10, year);
  const update = (part: number, next: number) => {
    const parts = [year, month, day, hour, minute];
    parts[part] = next;
    parts[2] = Math.min(parts[2], new Date(parts[0], parts[1], 0).getDate());
    onChange(`${parts[0]}-${pad(parts[1])}-${pad(parts[2])}T${pad(parts[3])}:${pad(parts[4])}`);
  };
  return <div className={`wheel-picker ${timeOnly ? "wheel-time-only" : ""}`} role="group" aria-label="일정 날짜와 시간 (한국 시간)">
    <p className="wheel-preview" aria-live="polite">{year}년 {month}월 {day}일 · {pad(hour)}:{pad(minute)}</p>
    <div className="wheel-columns">
      {[
        { label: "년", values: numbers(firstYear, lastYear - firstYear + 1), value: year },
        { label: "월", values: numbers(1, 12), value: month },
        { label: "일", values: numbers(1, new Date(year, month, 0).getDate()), value: day },
        { label: "시", values: numbers(0, 24), value: hour },
        { label: "분", values: numbers(0, 12).map((n) => n * 5), value: minute },
      ].map((column, i) => ({ ...column, part: i })).filter((column) => !timeOnly || column.part >= 3)
        .map(({ part, ...column }) => <Wheel key={column.label} {...column} disabled={disabled} onChange={(next) => update(part, next)} />)}
    </div>
    <p className="wheel-hint">위아래로 밀어 선택하세요</p>
  </div>;
}
