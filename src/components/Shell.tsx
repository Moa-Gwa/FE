"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Icon, { type IconName } from "@/components/Icon";
import Logo from "@/components/Logo";
import { useNoticeStream } from "@/hooks/useNoticeStream";
import { setSession, useSession } from "@/lib/session";

type NavItem = [href: string, icon: IconName, label: string];

const STUDENT_NAV: NavItem[] = [
  ["/home", "home", "홈"],
  ["/explore", "search", "탐색"],
  ["/life", "bag", "생활"],
  ["/schedule", "calendar", "일정"],
  ["/my", "user", "MY"],
];

const ADMIN_NAV: NavItem[] = [
  ["/admin/dashboard", "grid", "대시보드"],
  ["/admin/notices", "list", "공지 관리"],
  ["/admin/notices/new", "edit", "공지 작성"],
  ["/admin/schedule", "calendar", "일정"],
  ["/admin/organization", "settings", "조직 관리"],
];

function isActive(pathname: string, href: string, all: NavItem[]) {
  if (pathname === href) return true;
  // a longer, more specific nav entry wins (e.g. /admin/notices/new vs /admin/notices)
  const moreSpecific = all.some(([h]) => h !== href && h.startsWith(href) && pathname.startsWith(h));
  return !moreSpecific && pathname.startsWith(href + "/");
}

export default function Shell({ role, children }: { role: "STUDENT" | "ADMIN"; children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const connected = useNoticeStream();
  const nav = role === "STUDENT" ? STUDENT_NAV : ADMIN_NAV;

  useEffect(() => {
    if (session === null || (session && session.role !== role)) router.replace("/login");
  }, [session, role, router]);

  if (!session || session.role !== role) return null;

  const logout = () => {
    setSession(null);
    router.replace("/login");
  };

  const link = (n: NavItem) => (
    <Link key={n[0]} href={n[0]} className={isActive(pathname, n[0], nav) ? "active" : ""}>
      <span className="icon">
        <Icon name={n[1]} />
      </span>
      {n[2]}
    </Link>
  );

  if (role === "STUDENT") {
    // students always get the phone-sized layout, centered on wide screens
    return (
      <div className="m-bg">
        <div className="m-shell">
          <main className="main-m">{children}</main>
          <nav className="m-nav" aria-label="주 메뉴">
            {nav.map((n) => link(n))}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <div className="role-tag admin">ADMIN CONSOLE</div>
        <nav className="nav">{nav.map((n) => link(n))}</nav>
        <div className="side-bottom">
          <div className="profile-mini">
            <div className="avatar">{session.name.slice(0, 1)}</div>
            <div>
              <strong>{session.name}</strong>
              <span>{session.organization?.name}</span>
            </div>
          </div>
          <p className="list-note">
            <span className="live-dot" style={{ background: connected ? "#36a77f" : "#c9c0cf" }} />
            {connected ? "실시간 연결됨" : "연결 중…"}
          </p>
          <button className="logout" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
      <nav className="mobile-nav">{nav.map((n) => link(n))}</nav>
    </div>
  );
}
