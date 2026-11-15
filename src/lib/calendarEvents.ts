import type { ScheduleEntry } from "@/types";

const dayOf = (ms: number) => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
export const scheduleKey = (entry: ScheduleEntry) => `${entry.source}-${entry.type}-${entry.noticeId}`;

/** End timestamps are exclusive: ending at midnight does not occupy the following day. */
export function scheduleRange(entry: ScheduleEntry) {
  const start = Date.parse(entry.at);
  const end = entry.endAt ? Date.parse(entry.endAt) : start;
  return { from: dayOf(start), to: dayOf(end > start ? end - 1 : start) };
}

export function occursOn(entry: ScheduleEntry, day: string) {
  const { from, to } = scheduleRange(entry);
  return from <= day && day <= to;
}

export type CalendarSegment = {
  entry: ScheduleEntry; start: number; span: number; lane: number; before: boolean; after: boolean;
};

/** Clip each identity to this week and assign non-overlapping rows. Equal titles stay separate. */
export function weekSegments(entries: ScheduleEntry[], days: (string | null)[]): CalendarSegment[] {
  const unique = [...new Map(entries.map(e => [scheduleKey(e), e])).values()];
  const candidates = unique.map(entry => {
    const range = scheduleRange(entry);
    const columns = days.flatMap((day, i) => day && day >= range.from && day <= range.to ? [i] : []);
    if (!columns.length) return null;
    const start = columns[0], last = columns[columns.length - 1];
    return { entry, start, span: last - start + 1, lane: 0, before: range.from < days[start]!, after: range.to > days[last]! };
  }).filter((s): s is CalendarSegment => s !== null)
    .sort((a, b) => a.start - b.start || b.span - a.span || scheduleKey(a.entry).localeCompare(scheduleKey(b.entry)));
  const occupied: number[] = [];
  return candidates.map(segment => {
    let lane = occupied.findIndex(end => end < segment.start);
    if (lane < 0) lane = occupied.length;
    occupied[lane] = segment.start + segment.span - 1;
    return { ...segment, lane };
  });
}
