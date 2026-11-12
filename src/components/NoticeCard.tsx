/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import InlineError from "@/components/InlineError";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
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
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnail = item.thumbnail?.trim();

  const toggle = useMutation({
    mutationFn: () =>
      api<void>(`/me/bookmarks/${item.source}/${item.id}`, { method: item.bookmarked ? "DELETE" : "PUT" }),
    onSuccess: () => {
      toast(item.bookmarked ? "저장을 취소했어요." : "내 공지에 저장했어요.");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
      qc.invalidateQueries({ queryKey: ["notice"] });
    },
  });

  const href = `/notices/${item.source.toLowerCase()}/${item.id}`;
  const org = item.organization.name;
  const date = fmtDate(item.publishedAt).slice(5);

  const deadline = item.deadlineAt && item.status !== "CLOSED" && item.status !== "ENDED" ? dDay(item.deadlineAt) : null;
  const meta = [item.category ? byCode(item.category) : null, org, date].filter(Boolean).join(" · ");
  // 상태는 배지 대신 메타 줄 글자로. 오늘 마감만 빨간 글자
  const state = deadline
    ? { text: deadline === "D-Day" ? "오늘 마감" : `마감 ${deadline}`, tone: deadline === "D-Day" ? "red" : "" }
    : item.status === "UPCOMING"
      ? { text: item.eventStartAt ? `${fmtDate(item.eventStartAt).slice(5)} 시작` : "예정", tone: "" }
      : item.status === "CLOSED" || item.status === "ENDED"
        ? { text: item.status === "CLOSED" ? "마감" : "종료", tone: "muted" }
        : null;

  return (
    <>
    <article className={`notice-card ${compact ? "compact" : ""} ${item.urgent ? "urgent" : ""}`}>
      <div className={`nc-avatar ${orgInitials(org).length > 3 ? "long" : ""} ${orgInitials(org) === "가대" ? "sky" : ""}`} aria-hidden="true">
        {orgInitials(org)}
      </div>
      <Link href={href} className="nc-link nc-body">
        <h3>{item.title}</h3>
        <p className="nc-meta">
          {item.urgent && <span className="nc-flag blue">중요</span>}
          {state && <span className={`nc-flag ${state.tone}`}>{state.text}</span>}
          <span className="nc-sub">{meta}</span>
        </p>
      </Link>
      {thumbnail && failedThumbnail !== thumbnail && (
        <Link href={href} className="nc-thumbnail" tabIndex={-1} aria-hidden="true">
          <img className="thumb" src={assetUrl(thumbnail)} alt="" loading="lazy" decoding="async" onError={() => setFailedThumbnail(thumbnail)} />
        </Link>
      )}
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
    <InlineError error={toggle.error} className="card-error" />
    </>
  );
}
