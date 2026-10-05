"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import FeedList from "@/components/FeedList";
import TopBar from "@/components/TopBar";
import { useCategories } from "@/hooks/useMeta";
import { STATUS_LABEL } from "@/lib/format";

const ORG_TYPES = [
  ["", "전체"],
  ["UNIVERSITY", "대학"],
  ["DEPARTMENT", "학과"],
  ["STUDENT_GOVERNMENT", "학생자치단체"],
];
const STATUSES = [["", "전체"], ...(["UPCOMING", "ONGOING", "DEADLINE_SOON", "CLOSED"] as const).map((s) => [s, STATUS_LABEL[s]])];
const SORTS = [
  ["latest", "최신순"],
  ["deadline", "마감 임박순"],
  ["event", "일정순"],
  ["popular", "인기순"],
];

function Explore() {
  const params = useSearchParams();
  const router = useRouter();
  const { categories } = useCategories();
  const orgType = params.get("orgType") ?? "";
  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "latest";
  const q = params.get("q") ?? "";

  const [text, setText] = useState(q);

  // filters live in the URL; changing one only refetches the result list, the page stays mounted
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && !(key === "sort" && value === "latest")) next.set(key, value);
    else next.delete(key);
    router.replace(`/explore${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== q) set("q", text.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const chips = (key: string, current: string, options: string[][]) => (
    <div className="chips">
      {options.map(([value, label]) => (
        <button key={value} className={`chip ${current === value ? "on" : ""}`} onClick={() => set(key, value)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <TopBar title="공지 탐색" sub="관심 있는 소식을 빠르게 찾아보세요." />
      <label className="search" style={{ margin: "0 0 20px", maxWidth: "none" }}>
        ⌕{" "}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="공지 제목, 조직, 키워드 검색"
          aria-label="공지 검색"
        />
      </label>

      <div className="filters">
        <div className="filter-row">
          <b>발행 주체</b>
          {chips("orgType", orgType, ORG_TYPES)}
        </div>
        <div className="filter-row">
          <b>카테고리</b>
          {chips("category", category, [["", "전체"], ...categories.map((c) => [c.code, c.name])])}
        </div>
        <div className="filter-row">
          <b>상태</b>
          {chips("status", status, STATUSES)}
        </div>
        <div className="filter-row">
          <b>정렬</b>
          {chips("sort", sort, SORTS)}
        </div>
      </div>

      <FeedList params={{ orgType, category, status, sort, q }} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}
