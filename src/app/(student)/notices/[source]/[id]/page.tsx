"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Carousel from "@/components/Carousel";
import { useToast } from "@/components/Providers";
import StatusBadge from "@/components/StatusBadge";
import TopBar from "@/components/TopBar";
import { useCategories } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { dDay, fmtDate, fmtDateTime, ORG_TYPE_LABEL } from "@/lib/format";
import type { NoticeDetail } from "@/types";

export default function NoticePage() {
  const { source, id } = useParams<{ source: string; id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { byCode } = useCategories();
  const src = source === "crawled" ? "CRAWLED" : "MANUAL";
  const path = src === "CRAWLED" ? "crawled-notices" : "notices";

  const query = useQuery({ queryKey: ["notice", src, id], queryFn: () => api<NoticeDetail>(`/${path}/${id}`) });

  const counted = useRef<string | null>(null);
  useEffect(() => {
    if (counted.current === `${src}-${id}`) return;
    counted.current = `${src}-${id}`;
    api<void>(`/${path}/${id}/view`, { method: "POST", auth: false }).catch(() => {});
  }, [src, id, path]);

  const toggle = useMutation({
    mutationFn: (saved: boolean) => api<void>(`/me/bookmarks/${src}/${id}`, { method: saved ? "DELETE" : "PUT" }),
    onSuccess: (_d, saved) => {
      toast(saved ? "저장을 취소했어요." : "내 공지에 저장했어요.");
      qc.invalidateQueries({ queryKey: ["notice"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => toast(e.message),
  });

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: query.data?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("공지 링크를 복사했어요.");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const n = query.data;

  return (
    <>
      <TopBar title="공지 상세" />
      <button className="back" onClick={() => router.back()}>
        ← 뒤로
      </button>

      {query.isPending && <div className="empty">불러오는 중…</div>}
      {query.isError && (
        <div className="empty">
          {(query.error as Error).message}
          <br />
          <Link href="/explore" className="link-btn">
            공지 목록으로
          </Link>
        </div>
      )}

      {n && (
        <article className="detail-card">
          <Carousel images={n.images} />
          <div className="chips">
            {(n.categories.length ? n.categories : [null]).map((c) => (
              <span key={c ?? "none"} className={`pill ${c === "EVENT" ? "pink" : ""}`}>
                {byCode(c)}
              </span>
            ))}
            <StatusBadge status={n.status} urgent={n.urgent} />
          </div>
          <h1>{n.title}</h1>
          <div className="detail-info">
            <span>
              {n.organization.name} ({ORG_TYPE_LABEL[n.organization.type]})
            </span>
            <span>등록 {fmtDate(n.publishedAt)}</span>
            {n.updatedAt !== n.publishedAt && n.source === "MANUAL" && <span>수정 {fmtDate(n.updatedAt)}</span>}
            <span>조회 {n.viewCount}</span>
          </div>

          {(n.eventStartAt || n.deadlineAt || n.location) && (
            <dl className="info-grid">
              {n.eventStartAt && (
                <>
                  <dt>행사 일시</dt>
                  <dd>
                    {fmtDateTime(n.eventStartAt)}
                    {n.eventEndAt && ` ~ ${fmtDateTime(n.eventEndAt)}`}
                  </dd>
                </>
              )}
              {n.deadlineAt && (
                <>
                  <dt>신청 마감</dt>
                  <dd className="deadline">
                    {fmtDateTime(n.deadlineAt)} · {dDay(n.deadlineAt)}
                  </dd>
                </>
              )}
              {n.location && (
                <>
                  <dt>장소</dt>
                  <dd>{n.location}</dd>
                </>
              )}
            </dl>
          )}

          {n.contentHtml ? (
            // crawled HTML is sanitized by the backend (no scripts, styles or event handlers)
            <div className="html-body" dangerouslySetInnerHTML={{ __html: n.contentHtml }} />
          ) : (
            <div className="detail-body">{n.description}</div>
          )}

          <div className="btn-row">
            <button className="primary" disabled={toggle.isPending} onClick={() => toggle.mutate(n.bookmarked)}>
              {n.bookmarked ? "★ 저장됨" : "☆ 내 공지에 저장"}
            </button>
            <button className="secondary" onClick={share}>
              공유
            </button>
            {n.externalLink && (
              <a className="secondary" href={n.externalLink} target="_blank" rel="noopener noreferrer">
                {n.source === "CRAWLED" ? "원문 보기 ↗" : "관련 링크 ↗"}
              </a>
            )}
          </div>
        </article>
      )}
    </>
  );
}
