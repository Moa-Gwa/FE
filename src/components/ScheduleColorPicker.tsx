"use client";

import { SCHEDULE_COLORS } from "@/lib/scheduleColors";

export default function ScheduleColorPicker({ value, onChange, disabled = false, compact = false }: {
  value: string | null; onChange: (color: string | null) => void; disabled?: boolean; compact?: boolean;
}) {
  if (compact) return <div className="schedule-color-select">
    <label htmlFor="personal-color">일정 색상</label>
    <select id="personal-color" value={value ?? ""} disabled={disabled} onChange={e => onChange(e.target.value || null)}>
      <option value="">기본</option>
      {SCHEDULE_COLORS.map(c => <option value={c.value} key={c.value}>{c.name}</option>)}
      {value && !SCHEDULE_COLORS.some(c => c.value === value) && <option value={value}>사용자 지정</option>}
    </select>
  </div>;
  return <div className="schedule-color-options" role="radiogroup" aria-label="일정 색상">
    {[{ name: "기본 색상", value: null }, ...SCHEDULE_COLORS].map(c => <button type="button" key={c.name} role="radio"
      aria-label={c.name} aria-checked={value === c.value} title={c.name} disabled={disabled} onClick={() => onChange(c.value)}>
      <span style={{ background: c.value ?? "#F2F3F5", color: c.value ? "#FFF" : "#606675" }}>{value === c.value ? "✓" : c.value ? "" : "↺"}</span>
    </button>)}
  </div>;
}
