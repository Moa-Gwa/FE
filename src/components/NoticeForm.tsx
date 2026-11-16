"use client";

import { useEffect, useRef, useState } from "react";
import InlineError from "@/components/InlineError";
import Icon from "@/components/Icon";
import { useCategories } from "@/hooks/useMeta";
import BlocksEditor, { countImages, MAX_IMAGES } from "@/components/BlocksEditor";
import NoticePreview from "@/components/notice-form/NoticePreview";
import PublishPanel from "@/components/notice-form/PublishPanel";
import TemplateModal from "@/components/notice-form/TemplateModal";
import { useNoticeForm } from "@/components/notice-form/useNoticeForm";
import type { AdminNotice } from "@/types";

export default function NoticeForm({ initial }: { initial: AdminNotice | null }) {
  const { categories } = useCategories();
  const form = useNoticeForm(initial);
  const { title, blocks, published } = form;
  const [templateOpen, setTemplateOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const catNames = form.categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter((n): n is string => !!n);

  return (
    <div className={`writer ${showPreview ? "" : "no-preview"}`}>
      {/* ---------- write: title + body, live preview on the right ---------- */}
      <section className="writer-edit" aria-label="공지 작성">
        <div className="writer-scroll">
          <div className="writer-inner">
            <textarea
              ref={titleRef}
              className="writer-title"
              rows={1}
              value={title}
              maxLength={40}
              onChange={(e) => form.setTitle(e.target.value.replace(/\n/g, ""))}
              placeholder="제목을 입력하세요"
              aria-label="제목"
            />
            <div className="writer-rule" aria-hidden="true" />
            <div className="writer-meta">
              <span className="counter">{title.length} / 40</span>
              {initial && <span className="writer-status">{published ? "게시 중인 공지 수정" : "임시저장된 공지"}</span>}
            </div>

            <div className="writer-toolbar" role="toolbar" aria-label="본문 도구">
              <button type="button" onClick={() => form.addBlock("TEXT")}>
                <Icon name="edit" /> 글
              </button>
              <button type="button" disabled={countImages(blocks) >= MAX_IMAGES} onClick={() => form.addBlock("IMAGES")}>
                <Icon name="grid" /> 이미지
              </button>
              <span className="tb-sep" />
              <button type="button" onClick={() => setTemplateOpen(true)}>
                템플릿
              </button>
              <button type="button" className="tb-preview" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "미리보기 닫기" : "미리보기"}
              </button>
            </div>

            {form.step === "write" && <InlineError error={form.error} className="writer-error" />}
            <BlocksEditor blocks={blocks} onChange={form.setBlocks} onUpload={form.upload} uploading={form.uploading} />
          </div>
        </div>

        <footer className="writer-foot">
          <button type="button" className="writer-exit" onClick={form.leave}>
            <Icon name="chevron" /> 나가기
          </button>
          <div className="writer-foot-actions">
            {!published && (
              <button type="button" className="ghost" disabled={form.saving} onClick={() => form.submit("DRAFT")}>
                임시저장
              </button>
            )}
            <button type="button" className="primary" onClick={form.toPublish}>
              {published ? "저장하기" : "게시하기"}
            </button>
          </div>
        </footer>
      </section>

      <NoticePreview form={form} catNames={catNames} />

      {templateOpen && (
        <TemplateModal
          onClose={() => setTemplateOpen(false)}
          onApply={(text) => {
            form.applyTemplate(text);
            setTemplateOpen(false);
          }}
        />
      )}

      {/* ---------- publish: settings step (velog "출간" screen) ---------- */}
      {form.step === "publish" && <PublishPanel form={form} categories={categories} />}
    </div>
  );
}
