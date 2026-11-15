"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";

type State = { enabled: boolean; at: string; remindAt: string; tooLate: boolean };

export default function ReminderToggle({ source, id }: { source: string; id: number | string }) {
  const client = useQueryClient();
  const path = `/me/reminders/${source}/${id}`;
  const queryKey = ["reminder", source, id];
  const query = useQuery({ queryKey, queryFn: () => api<State>(path) });
  const change = useMutation({
    mutationFn: (enabled: boolean) => api<State>(path, { method: "PUT", body: { enabled } }),
    onSuccess: data => client.setQueryData(queryKey, data),
  });
  return <div className="correction-box reminder-settings">
    <div className="setting-row">
      <span>{source === "PERSONAL" ? "시작" : "마감"} 24시간 전 리마인더</span>
      <button type="button" role="switch" aria-label="24시간 전 리마인더" aria-checked={query.data?.enabled ?? false}
        className={`switch ${query.data?.enabled ? "on" : ""}`} disabled={!query.data || change.isPending}
        onClick={() => change.mutate(!query.data?.enabled)}><i /></button>
    </div>
    <p className="hint">{query.data?.tooLate ? "24시간 전 알림 시점이 지났어요. 현재 날짜로는 알림을 보내지 않아요." : "앱 안 알림으로 알려드려요. 기기 푸시는 MY에서 별도로 켜 주세요."}</p>
    {source === "CRAWLED" && <p className="hint">자동 추출된 마감일이 원문과 맞는지 확인해 주세요.</p>}
    <InlineError error={query.error ?? change.error} />
  </div>;
}
