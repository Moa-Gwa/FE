"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminMobileMenu from "@/components/AdminMobileMenu";
import AppNotices from "@/components/AppNotices";
import ChatbotWidget from "@/components/ChatbotWidget";
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
  // 약관 동의 전 학생은 서비스 API가 403이므로 동의 화면부터 보여 줌
  const needsConsent = role === "STUDENT" && session?.role === "STUDENT" && !session.consented;
  useForegroundPush(role === "STUDENT" && session?.role === "STUDENT" && !needsConsent);
  const [logoutError, setLogoutError] = useState<unknown>(null);
  // 세션에 사용자 id가 없어 닉네임으로 계정 변경 감지
  useChatConnection(role === "STUDENT" && session?.role === "STUDENT" && session.verified && !needsConsent ? session.name : null);
  const nav = role === "STUDENT" ? STUDENT_NAV : session?.operator ? [...ADMIN_NAV, ...OPERATOR_NAV] : ADMIN_NAV;

  // 하단 탭바는 홈 화면 웹앱에서 아래쪽 안전 영역만큼 높아짐. 실제 높이를 재서 챗봇, 생활 탭 고정 버튼을 그 위에 둠
  const measureNav = useCallback((nav: HTMLElement | null) => {
    if (!nav) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--m-nav-h", `${nav.getBoundingClientRect().height}px`));
    observer.observe(nav);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--m-nav-h");
    };
  }, []);
  useEffect(() => {
    if (session === null || (session && session.role !== role)) router.replace("/login");
    else if (needsConsent) router.replace(`/consent?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [session, role, router, needsConsent, pathname]);

  if (!session || session.role !== role || needsConsent) return null;

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
          <main className="main-m" data-page={pathname}><AppNotices role="STUDENT" />{children}</main>
          {/* 생활 탭과 관심사 화면은 아래쪽 고정 버튼이 있어 챗봇 버튼만 숨기고 대화는 유지 */}
          <ChatbotWidget showButton={!pathname.startsWith("/life") && pathname !== "/my/interests"} />
          <nav className="m-nav" aria-label="주 메뉴" ref={measureNav}>
            {nav.map((n) => link(n))}
          </nav>
        </div>
      </div>
    );
  }

  // 데스크톱 사이드바와 모바일 메뉴가 같은 내용을 씀
  const sidebar = (
    <>
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
    </>
  );

  return (
    <div className="shell">
      <aside className="side">{sidebar}</aside>
      <AdminMobileMenu>{sidebar}</AdminMobileMenu>
      <main className="main"><AppNotices role="ADMIN" />{children}</main>
    </div>
  );
}
