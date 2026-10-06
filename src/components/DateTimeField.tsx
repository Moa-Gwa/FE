"use client";

import { useEffect, useRef, useState } from "react";
import Calendar from "@/components/Calendar";
import Icon from "@/components/Icon";

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 10, 20, 30, 40, 50];

/** "2026년 10월 7일 (수) 오후 12:30" from a "YYYY-MM-DDTHH:mm" local value */
function label(v: string) {
  const [d, t] = v.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, day).getDay()];
  return `${y}년 ${m}월 ${day}일 (${wd}) ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${pad(min)}`;
}
const hourLabel = (h: number) => `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}시`;

/**
 * Date + time picker in the app's own (TDS-style) look, replacing the browser's datetime-local popup.
 * Value is the same "YYYY-MM-DDTHH:mm" local string datetime-local used, or "" for none.
 */
export default function DateTimeField({
  value,
  onChange,
  placeholder = "날짜와 시간을 선택하세요",
  min,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  ariaLabel?: string;
}) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const box = useRef<HTMLDivElement>(null);

  function openPicker() {
    const base = value || min || "";
    const d = base ? base.slice(0, 10) : null;
    const [h, m] = base ? base.slice(11, 16).split(":").map(Number) : [9, 0];
    setDay(value ? d : null);
    setHour(h);
    setMinute(MINUTES.includes(m) ? m : Math.min(50, Math.round(m / 10) * 10));
    const ref = d ? new Date(`${d}T00:00`) : now;
    setCursor({ year: ref.getFullYear(), month: ref.getMonth() });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", off);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", off);
    };
  }, [open]);

  // keep the selected hour / minute in view when the picker opens
  useEffect(() => {
    if (!open) return;
    box.current?.querySelectorAll<HTMLElement>(".dt-col .on").forEach((el) => el.scrollIntoView({ block: "center" }));
  }, [open]);

  const confirm = () => {
    if (!day) return;
    onChange(`${day}T${pad(hour)}:${pad(minute)}`);
    setOpen(false);
  };

  return (
    <div className="dt-field" ref={box}>
      <button type="button" className={`select-field ${value ? "" : "empty"}`} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPicker())}>
        <span>{value ? label(value) : placeholder}</span>
        <Icon name="calendar" />
      </button>
      {open && (
        <div className="dt-pop" role="dialog" aria-label={ariaLabel ?? "날짜와 시간 선택"}>
          <div className="dt-body">
            <div className="dt-cal">
              <Calendar
                year={cursor.year}
                month={cursor.month}
                markedDays={new Set()}
                selected={day}
                minDay={min ? min.slice(0, 10) : undefined}
                onSelect={setDay}
                onMove={(d) => {
                  const next = new Date(cursor.year, cursor.month + d, 1);
                  setCursor({ year: next.getFullYear(), month: next.getMonth() });
                }}
              />
            </div>
            <div className="dt-time">
              <div className="dt-col" role="listbox" aria-label="시">
                {HOURS.map((h) => (
                  <button type="button" key={h} role="option" aria-selected={h === hour} className={h === hour ? "on" : ""} onClick={() => setHour(h)}>
                    {hourLabel(h)}
                  </button>
                ))}
              </div>
              <div className="dt-col" role="listbox" aria-label="분">
                {MINUTES.map((m) => (
                  <button type="button" key={m} role="option" aria-selected={m === minute} className={m === minute ? "on" : ""} onClick={() => setMinute(m)}>
                    {pad(m)}분
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="dt-foot">
            <span className="dt-preview">{day ? label(`${day}T${pad(hour)}:${pad(minute)}`) : "날짜를 선택하세요"}</span>
            {value && (
              <button
                type="button"
                className="dt-clear"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                지우기
              </button>
            )}
            <button type="button" className="primary dt-ok" disabled={!day} onClick={confirm}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
