"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import FeedList from "@/components/FeedList";
import Icon from "@/components/Icon";
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

  const [sheet, setSheet] = useState(false);
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftSort, setDraftSort] = useState(sort);
  const openSheet = () => {
    setDraftStatus(status);
    setDraftSort(sort);
    setSheet(true);
  };
  const applySheet = () => {
    const next = new URLSearchParams(params.toString());
    if (draftStatus) next.set("status", draftStatus);
    else next.delete("status");
    if (draftSort && draftSort !== "latest") next.set("sort", draftSort);
    else next.delete("sort");
    router.replace(`/explore${next.size ? `?${next}` : ""}`, { scroll: false });
    setSheet(false);
  };
  const activeFilters = (status ? 1 : 0) + (sort !== "latest" ? 1 : 0);

  return (
    <>
      <TopBar title="공지 탐색" sub="관심 있는 소식을 빠르게 찾아보세요." />
      <label className="search">
        <Icon name="search" />{" "}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="공지 제목, 학과, 키워드"
          aria-label="공지 검색"
        />
      </label>

      <nav className="segmented" aria-label="발행 주체">
        {ORG_TYPES.map(([value, label]) => (
          <button key={value} className={orgType === value ? "on" : ""} aria-pressed={orgType === value} onClick={() => set("orgType", value)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="chip-scroll" role="group" aria-label="카테고리">
        {[["", "전체"], ...categories.map((c) => [c.code, c.name])].map(([value, label]) => (
          <button key={value} className={`chip ${category === value ? "on" : ""}`} aria-pressed={category === value} onClick={() => set("category", value)}>
            {label}
          </button>
        ))}
      </div>

      <div className="list-toolbar">
        <span>{SORTS.find(([v]) => v === sort)?.[1]}{status ? ` · ${STATUS_LABEL[status as keyof typeof STATUS_LABEL]}` : ""}</span>
        <button className="pill-link" onClick={openSheet} aria-haspopup="dialog">
          <Icon name="filter" /> 상태·정렬{activeFilters > 0 ? ` ${activeFilters}` : ""}
        </button>
      </div>

      <FeedList params={{ orgType, category, status, sort, q }} />

      {sheet && (
        <div className="sheet-back" onClick={() => setSheet(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-label="필터" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="row-between">
              <h2>필터</h2>
              <button className="icon-button" aria-label="닫기" onClick={() => setSheet(false)}>
                ✕
              </button>
            </div>
            <div className="sheet-label">상태</div>
            <div className="chips">
              {STATUSES.map(([value, label]) => (
                <button key={value} className={`chip ${draftStatus === value ? "on" : ""}`} aria-pressed={draftStatus === value} onClick={() => setDraftStatus(value)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="sheet-label">정렬</div>
            <div className="radio-list">
              {SORTS.map(([value, label]) => (
                <label key={value}>
                  {label}
                  <input type="radio" name="sort" checked={draftSort === value} onChange={() => setDraftSort(value)} />
                </label>
              ))}
            </div>
            <div className="sheet-actions">
              <button
                className="ghost"
                onClick={() => {
                  setDraftStatus("");
                  setDraftSort("latest");
                }}
              >
                초기화
              </button>
              <button className="primary" onClick={applySheet}>
                결과 보기
              </button>
            </div>
          </section>
        </div>
      )}
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
