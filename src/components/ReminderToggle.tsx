"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";

type State = { enabled: boolean; at: string; remindAt: string; tooLate: boolean };

export default function ReminderToggle({ source, id, kind = "DEADLINE" }: { source: string; id: number | string; kind?: "DEADLINE" | "EVENT_START" }) {
  const client = useQueryClient();
  const eventStart = kind === "EVENT_START";
  const timing = eventStart ? "1시간 전" : "24시간 전";
  const path = `/me/reminders/${source}/${id}${eventStart ? "?kind=EVENT_START" : ""}`;
  const queryKey = ["reminder", source, id, kind];
  const query = useQuery({ queryKey, queryFn: () => api<State>(path) });
  const change = useMutation({
    mutationFn: (enabled: boolean) => api<State>(path, { method: "PUT", body: { enabled } }),
    onSuccess: data => client.setQueryData(queryKey, data),
  });
  return <div className="correction-box reminder-settings">
    <div className="setting-row">
      <span>{eventStart ? "행사 시작" : source === "PERSONAL" ? "시작" : "마감"} {timing} 리마인더</span>
      <button type="button" role="switch" aria-label={`${timing} 리마인더`} aria-checked={query.data?.enabled ?? false}
        className={`switch ${query.data?.enabled ? "on" : ""}`} disabled={!query.data || change.isPending}
        onClick={() => change.mutate(!query.data?.enabled)}><i /></button>
    </div>
    <p className="hint">{query.data?.tooLate ? `${timing} 알림 시점이 지났어요. 현재 날짜로는 알림을 보내지 않아요.` : "앱 안 알림으로 알려드려요. 기기 푸시는 MY에서 별도로 켜 주세요."}</p>
    {source === "CRAWLED" && <p className="hint">자동 추출된 {eventStart ? "행사 시작일" : "마감일"}이 원문과 맞는지 확인해 주세요.</p>}
    <InlineError error={query.error ?? change.error} />
  </div>;
}
