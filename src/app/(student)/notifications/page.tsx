"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import InlineError from "@/components/InlineError";
import Badge from "@/components/Badge";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { NotificationItem } from "@/types";

const TYPE_LABEL: Record<string, string> = {
  REMINDER: "리마인더",
  NEW_NOTICE: "새 공지",
  URGENT: "중요 공지",
  TRADE_REQUESTED: "거래 요청",
  TRADE_ACCEPTED: "거래 수락",
};

/** 거래 알림의 noticeId는 물품 id */
function hrefOf(n: NotificationItem) {
  if (n.source === "PERSONAL") return "/schedule";
  return n.source === "MARKET" ? `/life/items/${n.noticeId}` : `/notices/${n.source.toLowerCase()}/${n.noticeId}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ unreadCount: number; items: NotificationItem[] }>("/me/notifications"),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const readOne = useMutation({ mutationFn: (id: number) => api<void>(`/me/notifications/${id}/read`, { method: "PUT" }), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api<void>("/me/notifications/read-all", { method: "PUT" }), onSuccess: refresh });

  const items = query.data?.items ?? [];

  return (
    <>
      <TopBar
        back
        title="알림"
        sub="관심 학과·단체의 새 공지와 거래 소식을 알려드려요."
        actions={
          <button className="secondary" disabled={!query.data?.unreadCount || readAll.isPending} onClick={() => readAll.mutate()}>
            모두 읽음
          </button>
        }
      />
      <p className="list-note">읽은 알림은 읽은 날부터 14일 후 자동으로 삭제돼요.</p>
      <InlineError error={readAll.error || readOne.error} />
      {query.isPending ? (
        <div className="empty">불러오는 중…</div>
      ) : query.isError ? (
        <InlineError error={query.error} />
      ) : items.length === 0 ? (
        <div className="empty"><img className="empty-mascot" src="/mascot-sleep.webp" alt="" />아직 알림이 없어요.<br />관심정보를 설정하면 새 공지를 알려드려요.</div>
      ) : (
        <div className="notice-list">
          {items.map((n) => (
            <article
              key={n.id}
              className={`notice-card compact notification-card ${n.read ? "notification-read" : "unread"}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (!n.read) readOne.mutate(n.id);
                router.push(hrefOf(n));
              }}
            >
              <div className="notice-card-top">
                <Badge color={n.type === "URGENT" ? "blue" : "elephant"}>{TYPE_LABEL[n.type] ?? n.type}</Badge>
                {n.read ? <Badge color="elephant" label="읽은 알림">읽음</Badge> : (
                  <Badge color="blue" variant="fill" label="읽지 않은 알림">
                    NEW
                  </Badge>
                )}
              </div>
              <h3>{n.title}</h3>
              <div className="notice-meta">
                <span>{n.body}</span>
                <span>{fmtDateTime(n.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
