"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { NotificationItem } from "@/types";

const TYPE_LABEL: Record<string, string> = { NEW_NOTICE: "새 공지", URGENT: "긴급 공지" };

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
        title="알림"
        sub="관심 학과·단체의 새 공지를 알려드려요."
        actions={
          <button className="secondary" disabled={!query.data?.unreadCount} onClick={() => readAll.mutate()}>
            모두 읽음
          </button>
        }
      />
      {query.isPending ? (
        <div className="empty">불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="empty">아직 알림이 없어요.<br />관심정보를 설정하면 새 공지를 알려드려요.</div>
      ) : (
        <div className="notice-list">
          {items.map((n) => (
            <article
              key={n.id}
              className={`notice-card compact ${n.read ? "" : "unread"}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (!n.read) readOne.mutate(n.id);
                router.push(`/notices/${n.source.toLowerCase()}/${n.noticeId}`);
              }}
            >
              <div className="notice-card-top">
                <span className={`pill ${n.type === "URGENT" ? "red" : ""}`}>{TYPE_LABEL[n.type] ?? n.type}</span>
                {!n.read && <span className="pill pink">NEW</span>}
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
