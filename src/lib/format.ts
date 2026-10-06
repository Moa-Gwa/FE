import type { DisplayStatus, OrgType } from "@/types";

const TZ = "Asia/Seoul";

const dateFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: TZ,
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const timeFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

export const fmtDate = (iso: string) => dateFmt.format(new Date(iso)).replace(/\.\s?/g, ".").replace(/\.$/, "");
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));

/** "YYYY-MM-DD" of an instant in Korea time. */
export function kstDay(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return p.format(d);
}

export function dDay(iso: string): string {
  const diff = new Date(kstDay(iso)).getTime() - new Date(kstDay(new Date())).getTime();
  const days = Math.round(diff / 86_400_000);
  return days === 0 ? "D-Day" : days > 0 ? `D-${days}` : `D+${-days}`;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  UPCOMING: "예정",
  ONGOING: "진행 중",
  DEADLINE_SOON: "마감 임박",
  CLOSED: "마감",
  ENDED: "종료",
};

export const STATUS_TONE: Record<DisplayStatus, string> = {
  UPCOMING: "gray",
  ONGOING: "gray",
  DEADLINE_SOON: "hot",
  CLOSED: "gray",
  ENDED: "gray",
};

/** Two-letter badge for an organization avatar: "총학생회" → "총학", "AI융합학부 학생회" → "AI", "행정학과" → "행정". */
export function orgInitials(name: string): string {
  const n = name.trim();
  const latin = n.match(/^[A-Za-z]+/);
  if (latin) return latin[0].slice(0, 3).toUpperCase();
  if (/^총학생회/.test(n)) return "총학";
  const core = n.replace(/\s+/g, "").replace(/^컴퓨터/, "컴").replace(/^소프트웨어/, "소");
  return core.slice(0, 2);
}

/** Alternates avatar tones so neighbouring rows don't all look the same. */
export function orgTone(name: string): "coral" | "lilac" {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2 === 0 ? "coral" : "lilac";
}

export const ORG_TYPE_LABEL: Record<OrgType, string> = {
  UNIVERSITY: "대학",
  DEPARTMENT: "학과",
  STUDENT_GOVERNMENT: "학생자치단체",
};

/** datetime-local value <-> ISO instant (the browser's zone is assumed to be Korea time). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);
