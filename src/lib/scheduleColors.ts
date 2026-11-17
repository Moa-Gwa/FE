import type { ScheduleEntry } from "@/types";

export const SCHEDULE_COLORS = [
  { name: "파랑", value: "#C7CEF5" }, { name: "초록", value: "#BFE6D3" },
  { name: "보라", value: "#DCCBEE" }, { name: "분홍", value: "#F5C6DA" },
  { name: "빨강", value: "#F5C4C7" }, { name: "노랑", value: "#F5E1A8" },
  { name: "청록", value: "#BDE5E6" }, { name: "회색", value: "#D9DCE3" },
];
// 이전에 저장된 진한 색은 같은 이름의 파스텔 색으로 보여 줌
const LEGACY_COLORS: Record<string, string> = {
  "#4651B3": "#C7CEF5", "#147D56": "#BFE6D3", "#7850A0": "#DCCBEE", "#B83B72": "#F5C6DA",
  "#B83B45": "#F5C4C7", "#956600": "#F5E1A8", "#167579": "#BDE5E6", "#606675": "#D9DCE3",
};
export function pastelColor(color: string | null | undefined) {
  return color ? LEGACY_COLORS[color.toUpperCase()] ?? color : null;
}
export function scheduleColor(entry: ScheduleEntry) {
  return pastelColor(entry.color) ?? (entry.type === "ACADEMIC" ? "#BFE6D3" : entry.type === "DEADLINE" ? "#F5E1A8" : "#C7CEF5");
}
export function colorText(color: string) {
  const channels = color.slice(1).match(/../g)!.map(s => parseInt(s, 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (1.05 / (luminance + 0.05)) >= 4.5 ? "#FFFFFF" : "#18212F";
}
