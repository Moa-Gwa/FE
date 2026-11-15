import type { ScheduleEntry } from "@/types";

export const SCHEDULE_COLORS = [
  { name: "파랑", value: "#4651B3" }, { name: "초록", value: "#147D56" },
  { name: "보라", value: "#7850A0" }, { name: "분홍", value: "#B83B72" },
  { name: "빨강", value: "#B83B45" }, { name: "노랑", value: "#956600" },
  { name: "청록", value: "#167579" }, { name: "회색", value: "#606675" },
];
export function scheduleColor(entry: ScheduleEntry) {
  return entry.color ?? (entry.type === "ACADEMIC" ? "#147D56" : entry.type === "DEADLINE" ? "#956600" : "#4651B3");
}
export function colorText(color: string) {
  const channels = color.slice(1).match(/../g)!.map(s => parseInt(s, 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (1.05 / (luminance + 0.05)) >= 4.5 ? "#FFFFFF" : "#18212F";
}
