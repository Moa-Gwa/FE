"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReminderToggle from "@/components/ReminderToggle";
import AttachmentList from "@/components/AttachmentList";
import BlocksView from "@/components/BlocksView";
import Carousel from "@/components/Carousel";
import DateCorrectionForm from "@/components/DateCorrectionForm";
import HtmlNoticeBody from "@/components/HtmlNoticeBody";
import Icon from "@/components/Icon";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import StatusBadge from "@/components/StatusBadge";
import TopBar from "@/components/TopBar";
import { useCategories } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { onSessionChange, useSession } from "@/lib/session";
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

  const session = useSession();
  const counted = useRef<string | null>(null);
  useEffect(() => onSessionChange(() => { counted.current = null; }), []);
  useEffect(() => {
    if (!query.isSuccess || session?.role !== "STUDENT") return;
    const key = `${session.name}-${src}-${id}`;
    if (counted.current === key) return;
    counted.current = key;
    api<void>(`/${path}/${id}/view`, { method: "POST" }).then(() => {
      qc.invalidateQueries({ queryKey: ["notice", src, id] });
    }).catch(() => {
      if (counted.current === key) counted.current = null;
    });
  }, [src, id, path, query.isSuccess, session?.role, session?.name, qc]);

  const [shareError, setShareError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const toggle = useMutation({
    mutationFn: (saved: boolean) => api<void>(`/me/bookmarks/${src}/${id}`, { method: saved ? "DELETE" : "PUT" }),
    onMutate: () => setShareError(null),
    onSuccess: (_d, saved) => {
      toast(saved ? "저장을 취소했어요." : "내 공지에 저장했어요.");
      qc.invalidateQueries({ queryKey: ["notice"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  async function share() {
    const url = window.location.href;
    setShareError(null);
    toggle.reset();
    try {
      if (navigator.share) await navigator.share({ title: query.data?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("공지 링크를 복사했어요.");
      }
    } catch (e) {
      // 공유 창을 닫은 경우(AbortError)는 오류가 아님
      if ((e as Error).name !== "AbortError") setShareError("공유하지 못했어요. 주소창의 링크를 직접 복사해 주세요.");
    }
  }

  const n = query.data;

  return (
    <>
      <TopBar title="공지 상세" back />
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
          {!n.blocks?.length && <Carousel images={n.images} />}
          <div className="detail-badges">
            <StatusBadge status={n.status} urgent={n.urgent} size="small" />
            <span className="tag-list">
              {(n.categories.length ? n.categories : [null]).map((c) => (
                <span key={c ?? "none"}>{byCode(c)}</span>
              ))}
            </span>
          </div>
          <h1>{n.title}</h1>
          <div className="detail-info">
            <span>
              {n.organization.name === "운영자" ? "운영자" : `${n.organization.name} (${ORG_TYPE_LABEL[n.organization.type]})`}
            </span>
            <span>등록 {fmtDate(n.publishedAt)}</span>
            {n.updatedAt !== n.publishedAt && n.source === "MANUAL" && <span>수정 {fmtDate(n.updatedAt)}</span>}
            <span>조회 {n.viewCount}</span>
            {n.source === "CRAWLED" && (
              <button type="button" className="correction-chip" aria-expanded={correcting} onClick={() => setCorrecting(true)}>
                날짜 오류
              </button>
            )}
          </div>

          {(n.eventStartAt || n.deadlineAt || n.location) && (
            <div className="info-callout">
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
            </div>
          )}
          {n.source === "CRAWLED" && (
            <div className="extracted-info">
              {n.dateEvidence && (
                <p className="evidence">
                  <span>원문 근거</span>
                  {n.dateEvidence}
                </p>
              )}
              {!!n.keywords?.length && (
                <ul className="keyword-list" aria-label="키워드">
                  {n.keywords.map((k) => (
                    <li key={k}>
                      <Link href={`/explore?q=${encodeURIComponent(k)}`}>#{k}</Link>
                    </li>
                  ))}
                </ul>
              )}
              <DateCorrectionForm noticeId={n.id} open={correcting} onClose={() => setCorrecting(false)} initialField={n.deadlineAt ? "DEADLINE" : "EVENT"} />
            </div>
          )}

          {n.blocks && n.blocks.length > 0 ? (
            <div style={{ margin: "22px 0" }}>
              <BlocksView blocks={n.blocks} />
            </div>
          ) : n.contentHtml ? (
            // crawled HTML is sanitized by the backend (no scripts, styles or event handlers)
            <HtmlNoticeBody html={n.contentHtml} />
          ) : (
            <div className="detail-body">{n.description}</div>
          )}

          <AttachmentList attachments={n.attachments} />

          <div className="btn-row">
            <button className="primary with-icon" aria-pressed={n.bookmarked} disabled={toggle.isPending} onClick={() => toggle.mutate(n.bookmarked)}>
              <Icon name="bookmark" /> {n.bookmarked ? "저장됨" : "내 공지에 저장"}
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
          {session?.role === "STUDENT" && n.bookmarked && n.eventStartAt && <ReminderToggle source={src} id={id} kind="EVENT_START" />}
          {session?.role === "STUDENT" && n.bookmarked && n.deadlineAt && <ReminderToggle source={src} id={id} />}
          <InlineError error={shareError ?? toggle.error} />
        </article>
      )}
    </>
  );
}
