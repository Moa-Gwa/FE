"use client";

import InlineError from "@/components/InlineError";
import DateTimeField from "@/components/DateTimeField";
import { assetUrl } from "@/lib/api";
import type { NoticeFormState } from "@/components/notice-form/useNoticeForm";
import type { Block, Category } from "@/types";

export default function PublishPanel({ form, categories }: { form: NoticeFormState; categories: Category[] }) {
  const { title, clean, urgent, categoryIds, published, mode } = form;
  const firstImage = clean.find((b) => b.type === "IMAGES");
  const excerpt = (clean.find((b) => b.type === "TEXT") as Extract<Block, { type: "TEXT" }> | undefined)?.text.replace(/\s+/g, " ").slice(0, 120);
  const primaryLabel = published ? "변경사항 저장" : mode === "SCHEDULED" ? "예약 게시" : "게시하기";

  return (
    <div className="publish" role="dialog" aria-modal="true" aria-label="게시 설정">
      <div className="publish-inner">
        <section className="publish-col">
          <h2>공지 미리보기</h2>
          <div className={`pub-thumb ${firstImage ? "" : "none"}`}>
            {firstImage && firstImage.type === "IMAGES" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(firstImage.images[0])} alt="" />
            ) : (
              <span>대표 이미지 없음</span>
            )}
          </div>
          <h3 className="pub-title">{title}</h3>
          <p className="pub-excerpt">{excerpt}</p>
          <label className="pub-toggle">
            <span>
              <b>중요 공지</b>
              <small>학내 NOW에 우선 노출되고 알림이 먼저 발송돼요.</small>
            </span>
            <button type="button" role="switch" aria-checked={urgent} className={`switch ${urgent ? "on" : ""}`} onClick={() => form.setUrgent(!urgent)}>
              <i />
            </button>
          </label>
        </section>

        <section className="publish-col">
          <h2>게시 설정</h2>
          <InlineError error={form.error} />

          <div className="pub-field">
            <span className="pub-label">카테고리 (1개 이상)</span>
            <div className="chips">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`chip ${categoryIds.includes(c.id) ? "on" : ""}`}
                  aria-pressed={categoryIds.includes(c.id)}
                  onClick={() => form.setCategoryIds((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pub-grid">
            <div className="pub-field">
              <span className="pub-label">행사 시작</span>
              <DateTimeField ariaLabel="행사 시작" value={form.eventStart} onChange={form.setEventStart} placeholder="선택 안 함" />
            </div>
            <div className="pub-field">
              <span className="pub-label">행사 종료</span>
              <DateTimeField ariaLabel="행사 종료" value={form.eventEnd} min={form.eventStart || undefined} onChange={form.setEventEnd} placeholder="선택 안 함" />
            </div>
            <div className="pub-field">
              <span className="pub-label">신청 마감</span>
              <DateTimeField ariaLabel="신청 마감" value={form.deadline} onChange={form.setDeadline} placeholder="선택 안 함" />
            </div>
            <label className="pub-field">
              <span className="pub-label">장소</span>
              <input value={form.location} maxLength={200} onChange={(e) => form.setLocation(e.target.value)} placeholder="예: 학생회관 앞 광장" />
            </label>
          </div>
          <label className="pub-field">
            <span className="pub-label">외부 링크</span>
            <input type="url" value={form.link} onChange={(e) => form.setLink(e.target.value)} placeholder="https://" />
          </label>

          {!published && (
            <div className="pub-field">
              <span className="pub-label">게시 방식</span>
              <div className="pub-seg" role="radiogroup" aria-label="게시 방식">
                <button type="button" role="radio" aria-checked={mode === "NOW"} className={mode === "NOW" ? "on" : ""} onClick={() => form.setMode("NOW")}>
                  즉시 게시
                </button>
                <button type="button" role="radio" aria-checked={mode === "SCHEDULED"} className={mode === "SCHEDULED" ? "on" : ""} onClick={() => form.setMode("SCHEDULED")}>
                  예약 게시
                </button>
              </div>
              {mode === "SCHEDULED" && <DateTimeField ariaLabel="예약 시각" value={form.publishAt} onChange={form.setPublishAt} placeholder="게시할 시각을 선택하세요" />}
            </div>
          )}

          <div className="publish-actions">
            <button type="button" className="ghost" onClick={form.backToWrite}>
              취소
            </button>
            <button type="button" className="primary" disabled={form.saving} onClick={() => form.submit(form.primaryMode)}>
              {primaryLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
