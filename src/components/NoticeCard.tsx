/* eslint-disable @next/next/no-img-element */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import StatusBadge from "@/components/StatusBadge";
import { useCategories } from "@/hooks/useMeta";
import { api, assetUrl } from "@/lib/api";
import { dDay, fmtDate, orgInitials, orgTone } from "@/lib/format";
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
  const org = item.organization.name;
  const date = fmtDate(item.publishedAt).slice(5);
  const sub = item.summary?.trim() || `${org} · 조회 ${item.viewCount}`;

  return (
    <article className={`notice-card ${compact ? "compact" : ""}`}>
      <div className={`nc-avatar ${orgTone(org)}`} aria-hidden="true">
        {orgInitials(org)}
      </div>
      <div className="nc-body">
        <div className="nc-top">
          {item.category && <span className="pill">{byCode(item.category)}</span>}
          <StatusBadge status={item.status === "DEADLINE_SOON" && item.deadlineAt ? null : item.status} urgent={item.urgent} />
          {item.deadlineAt && item.status !== "CLOSED" && item.status !== "ENDED" && (
            <span className="pill hot">마감 {dDay(item.deadlineAt)}</span>
          )}
          <span className="nc-date">{date}</span>
        </div>
        <Link href={href} className="nc-link">
          {!compact && item.thumbnail && <img className="thumb" src={assetUrl(item.thumbnail)} alt="" />}
          <h3>{item.title}</h3>
        </Link>
        <div className="nc-bottom">
          <span className="nc-sub">{sub}</span>
          {isStudent ? (
            <button
              className={`save ${item.bookmarked ? "saved" : ""}`}
              aria-label={item.bookmarked ? "저장 해제" : "저장"}
              aria-pressed={item.bookmarked}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate()}
            >
              <Icon name="bookmark" />
            </button>
          ) : (
            <Link href={href} className="nc-go" aria-label="자세히 보기">
              <Icon name="chevron" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
