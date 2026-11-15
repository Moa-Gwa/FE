"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminMobileMenu from "@/components/AdminMobileMenu";
import Icon, { type IconName } from "@/components/Icon";
import InlineError from "@/components/InlineError";
import Logo from "@/components/Logo";
import { useForegroundPush } from "@/hooks/useForegroundPush";
import { useChatConnection } from "@/hooks/useChat";
import { useNoticeStream } from "@/hooks/useNoticeStream";
import { logout } from "@/lib/api";
import { useSession } from "@/lib/session";

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

/** 서비스 운영자에게만 보이는 메뉴 */
const OPERATOR_NAV: NavItem[] = [["/admin/corrections", "check", "날짜 교정"], ["/admin/applications", "check", "관리자 신청"]];

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
  useForegroundPush(role === "STUDENT" && session?.role === "STUDENT");
  const [logoutError, setLogoutError] = useState<unknown>(null);
  // 세션에 사용자 id가 없어 닉네임으로 계정 변경 감지
  useChatConnection(role === "STUDENT" && session?.role === "STUDENT" && session.verified ? session.name : null);
  const nav = role === "STUDENT" ? STUDENT_NAV : session?.operator ? [...ADMIN_NAV, ...OPERATOR_NAV] : ADMIN_NAV;

  useEffect(() => {
    if (session === null || (session && session.role !== role)) router.replace("/login");
  }, [session, role, router]);

  if (!session || session.role !== role) return null;

  const signOut = async () => {
    setLogoutError(null);
    try {
      await logout();
      router.replace("/login");
    } catch (e) {
      setLogoutError(e);
    }
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
    // 모바일 하단 메뉴와 넓은 화면 사이드 메뉴는 같은 경로를 사용한다.
    return (
      <div className="m-bg">
        <div className="m-shell">
          <aside className="side student-side" aria-label="학생 사이드 메뉴">
            <Logo />
            <nav className="nav" aria-label="학생 메뉴">{nav.map(n => link(n))}</nav>
            <div className="side-bottom">
              <div className="profile-mini"><strong>{session.name}</strong></div>
              <button className="logout" onClick={signOut}>로그아웃</button>
              <InlineError error={logoutError} />
            </div>
          </aside>
          <main className="main-m" data-page={pathname}>{children}</main>
          <nav className="m-nav" aria-label="주 메뉴">
            {nav.map((n) => link(n))}
          </nav>
        </div>
      </div>
    );
  }

  const sidebar = <>

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
          <button className="logout" onClick={signOut}>
            로그아웃
          </button>
          <InlineError error={logoutError} />
        </div>

  </>;

  return (
    <div className="shell">
      <aside className="side">{sidebar}</aside>
      <AdminMobileMenu>{sidebar}</AdminMobileMenu>
      <main className="main">{children}</main>
    </div>
  );
}
