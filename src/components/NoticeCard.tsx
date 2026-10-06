/* eslint-disable @next/next/no-img-element */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import StatusBadge from "@/components/StatusBadge";
import { useCategories } from "@/hooks/useMeta";
import { api, assetUrl } from "@/lib/api";
import { dDay, fmtDate, orgInitials } from "@/lib/format";
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

  const deadline = item.deadlineAt && item.status !== "CLOSED" && item.status !== "ENDED" ? dDay(item.deadlineAt) : null;
  const meta = [item.category ? byCode(item.category) : null, org, date].filter(Boolean).join(" · ");

  return (
    <article className={`notice-card ${compact ? "compact" : ""}`}>
      <div className={`nc-avatar ${orgInitials(org).length > 3 ? "long" : ""}`} aria-hidden="true">
        {orgInitials(org)}
      </div>
      <Link href={href} className="nc-link nc-body">
        <h3>{item.title}</h3>
        <p className="nc-meta">
          <StatusBadge status={item.status === "ONGOING" || (item.status === "DEADLINE_SOON" && deadline) ? null : item.status} urgent={item.urgent} />
          {deadline && <span className="pill hot">마감 {deadline}</span>}
          <span className="nc-sub">{meta}</span>
        </p>
      </Link>
      {!compact && item.thumbnail && <img className="thumb" src={assetUrl(item.thumbnail)} alt="" />}
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
        <span className="nc-go" aria-hidden="true">
          <Icon name="chevron" />
        </span>
      )}
    </article>
  );
}
