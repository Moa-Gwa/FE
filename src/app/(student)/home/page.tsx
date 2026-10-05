"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FeedList from "@/components/FeedList";
import NoticeCard from "@/components/NoticeCard";
import TopBar from "@/components/TopBar";
import { useCategories } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { FeedItem, FeedPage } from "@/types";

const CATEGORY_ICON: Record<string, string> = {
  ACADEMIC: "▤",
  SCHOLARSHIP: "◈",
  WELFARE: "♡",
  EVENT: "✳",
  SNACK: "◍",
  PARTNERSHIP: "⚑",
  STUDENT_FEE: "₩",
  RECRUIT: "✎",
  ETC: "◌",
};

export default function StudentHome() {
  const session = useSession();
  const router = useRouter();
  const { categories } = useCategories();
  const now = useQuery({ queryKey: ["feed", "now"], queryFn: () => api<FeedItem[]>("/feed/now") });
  const forMe = useQuery({ queryKey: ["feed", "for-me-preview"], queryFn: () => api<FeedPage>("/feed/for-me?size=4") });

  return (
    <>
      <TopBar title={`안녕하세요, ${session?.name ?? ""}님`} sub="오늘도 필요한 학교 소식을 모아봤어요." />

      <section className="hero">
        <div className="eyebrow">CAMPUS NOTICE, ALL IN ONE</div>
        <h2>
          놓치면 아쉬운
          <br />
          학교 소식이에요
        </h2>
        <p>학사부터 행사까지, 나에게 필요한 공지를 한 곳에서 확인하세요.</p>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
          }}
        >
          ⌕ <input name="q" placeholder="어떤 공지를 찾고 있나요?" aria-label="공지 검색" />
        </form>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>학내 NOW</h2>
        </div>
        {now.isPending ? (
          <div className="empty">불러오는 중…</div>
        ) : now.data && now.data.length > 0 ? (
          <div className="grid two">
            {now.data.slice(0, 4).map((n) => (
              <NoticeCard key={`${n.source}-${n.id}`} item={n} compact />
            ))}
          </div>
        ) : (
          <div className="empty">지금 확인할 긴급·진행 중 공지가 없어요.</div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>카테고리</h2>
          <Link href="/explore" className="link-btn">
            전체 보기
          </Link>
        </div>
        <div className="category-row">
          {categories.map((c) => (
            <Link key={c.code} href={`/explore?category=${c.code}`} className="category">
              <span>{CATEGORY_ICON[c.code] ?? "✦"}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>나를 위한 공지</h2>
          <Link href="/my/interests" className="link-btn">
            관심정보 설정
          </Link>
        </div>
        {forMe.data && forMe.data.items.length > 0 ? (
          <div className="grid two">
            {forMe.data.items.map((n) => (
              <NoticeCard key={`${n.source}-${n.id}`} item={n} />
            ))}
          </div>
        ) : (
          <div className="empty">
            주전공·관심 학과를 설정하면 맞춤 공지가 여기에 나타나요.
            <br />
            <Link href="/my/interests" className="link-btn">
              관심정보 설정하러 가기 →
            </Link>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>최신 공지</h2>
        </div>
        <FeedList />
      </section>
    </>
  );
}
