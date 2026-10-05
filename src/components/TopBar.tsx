"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { NotificationItem } from "@/types";

export default function TopBar({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  const session = useSession();
  const isStudent = session?.role === "STUDENT";
  const unread = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ unreadCount: number; items: NotificationItem[] }>("/me/notifications"),
    enabled: isStudent,
  });
  const count = unread.data?.unreadCount ?? 0;

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="quick">
        {actions}
        {isStudent && (
          <>
            <Link className="round-button" href="/explore" aria-label="검색">
              <Icon name="search" />
            </Link>
            <Link className="round-button" href="/notifications" aria-label="알림">
              <Icon name="bell" />
              {count > 0 && <span className="badge-count">{count > 9 ? "9+" : count}</span>}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
