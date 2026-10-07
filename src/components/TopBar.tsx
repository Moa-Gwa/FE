"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { NotificationItem } from "@/types";

export default function TopBar({ title, sub, actions, home = false }: { title: string; sub?: string; actions?: React.ReactNode; home?: boolean }) {
  const session = useSession();
  const isStudent = session?.role === "STUDENT";
  const unread = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<{ unreadCount: number; items: NotificationItem[] }>("/me/notifications"),
    enabled: isStudent,
  });
  const count = unread.data?.unreadCount ?? 0;

  const quick = (
    <div className="quick">
      {actions}
      {isStudent && (
        <>
          <Link className="bar-icon" href="/explore" aria-label="검색">
            <Icon name="search" />
          </Link>
          <Link className="bar-icon" href="/notifications" aria-label={count > 0 ? `알림, 읽지 않은 알림 ${count}개` : "알림"}>
            <Icon name="bell" />
            {count > 0 && <span className="notification-dot" />}
          </Link>
        </>
      )}
    </div>
  );

  if (isStudent && home) {
    // home: greeting on the left, notifications on the right (no logo row)
    return (
      <header className="topbar student home">
        <div className="title-block">
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <Link className="bar-icon home-bell" href="/notifications" aria-label={count > 0 ? `알림, 읽지 않은 알림 ${count}개` : "알림"}>
          <Icon name="bell" />
          {count > 0 && <span className="notification-dot" />}
        </Link>
      </header>
    );
  }

  if (isStudent) {
    return (
      <header className="topbar student">
        <div className="brandbar">
          <Link href="/home" aria-label="모아과 홈">
            <Logo />
          </Link>
          {quick}
        </div>
        <div className="title-block">
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {quick}
    </header>
  );
}
