"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Logo from "@/components/Logo";
import { useNoticeStream } from "@/hooks/useNoticeStream";
import { setSession, useSession } from "@/lib/session";

type NavItem = [href: string, icon: string, label: string];

const STUDENT_NAV: NavItem[] = [
  ["/home", "⌂", "홈"],
  ["/explore", "⌕", "탐색"],
  ["/schedule", "◫", "일정"],
  ["/my", "☺", "MY"],
];

const ADMIN_NAV: NavItem[] = [
  ["/admin/dashboard", "▦", "대시보드"],
  ["/admin/notices", "▤", "공지 관리"],
  ["/admin/notices/new", "✎", "공지 작성"],
  ["/admin/schedule", "◫", "일정"],
  ["/admin/organization", "⚙", "조직 관리"],
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
      <span className="icon">{n[1]}</span>
      {n[2]}
    </Link>
  );

  return (
    <div className="shell">
      <aside className="side">
        <Logo />
        <div className={`role-tag ${role === "ADMIN" ? "admin" : ""}`}>
          {role === "STUDENT" ? "STUDENT PORTAL" : "ADMIN CONSOLE"}
        </div>
        <nav className="nav">{nav.map((n) => link(n))}</nav>
        <div className="side-bottom">
          <div className="profile-mini">
            <div className="avatar">{session.name.slice(0, 1)}</div>
            <div>
              <strong>{session.name}</strong>
              <span>{role === "ADMIN" ? session.organization?.name : "학생"}</span>
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
