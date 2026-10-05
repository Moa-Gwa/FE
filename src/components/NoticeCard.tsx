/* eslint-disable @next/next/no-img-element */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useToast } from "@/components/Providers";
import StatusBadge from "@/components/StatusBadge";
import { useCategories } from "@/hooks/useMeta";
import { api, assetUrl } from "@/lib/api";
import { dDay, fmtDate, fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { FeedItem } from "@/types";

export default function NoticeCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const { byCode } = useCategories();
  const session = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const isStudent = session?.role === "STUDENT";

  const toggle = useMutation({
    mutationFn: () =>
      api<void>(`/me/bookmarks/${item.source}/${item.id}`, { method: item.bookmarked ? "DELETE" : "PUT" }),
    onSuccess: () => {
      toast(item.bookmarked ? "저장을 취소했어요." : "내 공지에 저장했어요.");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["notice"] });
    },
    onError: (e) => toast(e.message),
  });

  const href = `/notices/${item.source.toLowerCase()}/${item.id}`;
  const deadline = item.deadlineAt ? `마감 ${fmtDateTime(item.deadlineAt)} · ${dDay(item.deadlineAt)}` : null;

  return (
    <article className={`notice-card ${compact ? "compact" : ""}`}>
      <div className="notice-card-top">
        <div className="left">
          <span className={`pill ${item.category === "EVENT" ? "pink" : ""}`}>{byCode(item.category)}</span>
          <StatusBadge status={item.status} urgent={item.urgent} />
        </div>
        {isStudent && (
          <button
            className={`save ${item.bookmarked ? "saved" : ""}`}
            aria-label={item.bookmarked ? "저장 해제" : "저장"}
            disabled={toggle.isPending}
            onClick={() => toggle.mutate()}
          >
            {item.bookmarked ? "♥" : "♡"}
          </button>
        )}
      </div>
      <Link href={href}>
        {!compact && item.thumbnail && <img className="thumb" src={assetUrl(item.thumbnail)} alt="" />}
        <h3>{item.title}</h3>
        {!compact && (
          <p>
            {item.organization.name} · {fmtDate(item.publishedAt)}
          </p>
        )}
        <div className="notice-meta">
          {deadline && <span className="deadline">{deadline}</span>}
          {compact && <span>{item.organization.name}</span>}
          <span>조회 {item.viewCount}</span>
        </div>
      </Link>
    </article>
  );
}
