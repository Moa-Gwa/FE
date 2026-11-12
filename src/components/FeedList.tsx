"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import NoticeCard from "@/components/NoticeCard";
import { api } from "@/lib/api";
import type { FeedPage } from "@/types";

/** Infinite-scrolling feed. `params` are query-string filters for GET /feed (or `path` override). */
export default function FeedList({
  params = {},
  path = "/feed",
  emptyText = "조건에 맞는 공지가 없어요.",
  onTotal,
}: {
  params?: Record<string, string | undefined>;
  path?: string;
  emptyText?: string;
  onTotal?: (n: number) => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ["feed", path, params],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const qs = new URLSearchParams({ page: String(pageParam), size: "15" });
      for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
      return api<FeedPage>(`${path}?${qs}`);
    },
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  useEffect(() => {
    if (onTotal && !hasNextPage) onTotal(items.length);
  });

  if (query.isError) return <div className="error">{(query.error as Error).message}</div>;
  if (query.isPending) return <div className="empty">불러오는 중…</div>;
  if (items.length === 0) return <div className="empty">{emptyText}</div>;

  return (
    <>
      <div className="notice-list">
        {items.map((item) => (
          <NoticeCard key={`${item.source}-${item.id}`} item={item} />
        ))}
      </div>
      <div ref={sentinel} className="list-note" style={{ textAlign: "center", minHeight: 24 }}>
        {isFetchingNextPage ? "더 불러오는 중…" : !hasNextPage ? "모든 공지를 확인했어요." : ""}
      </div>
    </>
  );
}
