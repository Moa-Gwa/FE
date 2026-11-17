"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { NotificationItem } from "@/types";

export default function TopBar({ title, sub, actions, home = false, back = false, art }: { title: string; sub?: string; actions?: React.ReactNode; home?: boolean; back?: boolean; /** 제목 옆 장식용 마스코트 */ art?: string }) {
  const session = useSession();
  const router = useRouter();
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
        <div className="topbar-actions">
          {back && (
            // 웹앱 전체 화면에는 브라우저 뒤로 가기가 없음. 알림 등으로 바로 열린 경우 홈으로 이동
            <button className="life-back" aria-label="뒤로" onClick={() => (history.length > 1 ? router.back() : router.replace("/home"))}>
              <Icon name="back" size={24} />
            </button>
          )}
          {quick}
        </div>
        <div className="title-block">
          {art && <img className="title-art" src={art} alt="" />}
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
