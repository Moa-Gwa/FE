"use client";

import { SCHEDULE_COLORS, colorText, pastelColor } from "@/lib/scheduleColors";

export default function ScheduleColorPicker({ value: saved, onChange, disabled = false }: {
  value: string | null; onChange: (color: string | null) => void; disabled?: boolean;
}) {
  const value = pastelColor(saved);
  return <div className="schedule-color-options" role="radiogroup" aria-label="일정 색상">
    {[{ name: "기본 색상", value: null }, ...SCHEDULE_COLORS].map(c => <button type="button" key={c.name} role="radio"
      aria-label={c.name} aria-checked={value === c.value} title={c.name} disabled={disabled} onClick={() => onChange(c.value)}>
      <span style={{ background: c.value ?? "#F2F3F5", color: c.value ? colorText(c.value) : "#606675" }}>{value === c.value ? "✓" : c.value ? "" : "↺"}</span>
    </button>)}
  </div>;
}
