/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef } from "react";
import ImageGroup from "@/components/ImageGroup";
import { assetUrl } from "@/lib/api";
import type { Block, BlockLayout } from "@/types";

export type EditorBlock = Block & { key: string };

let counter = 0;
export const newKey = () => `b${Date.now().toString(36)}${counter++}`;

export const MAX_IMAGES = 10;

export const countImages = (blocks: Block[]) =>
  blocks.reduce((n, b) => n + (b.type === "IMAGES" ? b.images.length : 0), 0);

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/**
 * Blog-style body editor: an ordered list of text and image blocks. Image blocks choose between a
 * slideshow and a vertical stack, and show a live preview of exactly how students will see them.
 */
export default function BlocksEditor({
  blocks,
  onChange,
  onUpload,
  uploading,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  onUpload: (files: FileList) => Promise<string[]>;
  uploading: boolean;
}) {
  const total = countImages(blocks);
  const remaining = MAX_IMAGES - total;

  const update = (i: number, patch: Partial<Block>) =>
    onChange(blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as EditorBlock) : b)));
  const insert = (at: number, block: Block) => onChange([...blocks.slice(0, at), { ...block, key: newKey() }, ...blocks.slice(at)]);

  const insertBar = (at: number) => (
    <div className="insert-bar" key={`ins${at}`}>
      <button type="button" onClick={() => insert(at, { type: "TEXT", text: "" })}>
        + 글
      </button>
      <button type="button" disabled={remaining <= 0} onClick={() => insert(at, { type: "IMAGES", images: [], layout: "CAROUSEL" })}>
        + 이미지
      </button>
    </div>
  );

  return (
    <div className="blocks-editor">
      {blocks.length === 0 && <div className="empty">아래 버튼으로 글이나 이미지를 추가해 보세요.</div>}
      {blocks.map((b, i) => (
        <div key={b.key}>
          {i === 0 && insertBar(0)}
          <div className="block-card">
            <div className="block-head">
              <b>{b.type === "TEXT" ? "글" : `이미지 (${b.images.length}장)`}</b>
              <div className="actions">
                <button type="button" aria-label="위로" disabled={i === 0} onClick={() => onChange(move(blocks, i, i - 1))}>
                  ↑
                </button>
                <button type="button" aria-label="아래로" disabled={i === blocks.length - 1} onClick={() => onChange(move(blocks, i, i + 1))}>
                  ↓
                </button>
                <button type="button" className="delete" aria-label="블록 삭제" onClick={() => onChange(blocks.filter((_, j) => j !== i))}>
                  삭제
                </button>
              </div>
            </div>

            {b.type === "TEXT" ? (
              <AutoTextarea value={b.text} onChange={(text) => update(i, { text })} />
            ) : (
              <ImageBlockEditor
                block={b}
                remaining={remaining}
                uploading={uploading}
                onLayout={(layout) => update(i, { layout })}
                onImages={(images) => update(i, { images })}
                onUpload={onUpload}
              />
            )}
          </div>
          {insertBar(i + 1)}
        </div>
      ))}
      {blocks.length === 0 && insertBar(0)}
      <p className="hint">
        이미지는 공지당 최대 {MAX_IMAGES}장 (JPG·PNG·WEBP, 장당 5MB). 현재 {total}장.
      </p>
    </div>
  );
}

function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  };
  return (
    <textarea
      ref={(el) => {
        if (el) fit(el);
      }}
      className="block-text"
      value={value}
      placeholder="내용을 입력하세요"
      onChange={(e) => {
        onChange(e.target.value);
        fit(e.target);
      }}
    />
  );
}

function ImageBlockEditor({
  block,
  remaining,
  uploading,
  onLayout,
  onImages,
  onUpload,
}: {
  block: Extract<Block, { type: "IMAGES" }>;
  remaining: number;
  uploading: boolean;
  onLayout: (l: BlockLayout) => void;
  onImages: (images: string[]) => void;
  onUpload: (files: FileList) => Promise<string[]>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const images = block.images;

  return (
    <div className="stack">
      <div className="radio-row">
        {(
          [
            ["CAROUSEL", "슬라이드 (옆으로 넘기기)"],
            ["STACK", "세로 나열"],
          ] as const
        ).map(([value, label]) => (
          <label key={value}>
            <input type="radio" checked={block.layout === value} onChange={() => onLayout(value)} /> {label}
          </label>
        ))}
      </div>

      {images.length > 0 && (
        <div className="upload-grid">
          {images.map((url, i) => (
            <div className="upload-item" key={`${url}-${i}`}>
              <img src={assetUrl(url)} alt={`이미지 ${i + 1}`} />
              <div className="ops">
                <button type="button" aria-label="앞으로" disabled={i === 0} onClick={() => onImages(move(images, i, i - 1))}>
                  ←
                </button>
                <button type="button" aria-label="이미지 삭제" onClick={() => onImages(images.filter((_, j) => j !== i))}>
                  삭제
                </button>
                <button type="button" aria-label="뒤로" disabled={i === images.length - 1} onClick={() => onImages(move(images, i, i + 1))}>
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <button type="button" className="secondary" disabled={uploading || remaining <= 0} onClick={() => input.current?.click()}>
          {uploading ? "업로드 중…" : "+ 사진 추가"}
        </button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="사진 파일 선택"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files?.length) return;
            const urls = await onUpload(files);
            if (urls.length) onImages([...images, ...urls]);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <div className="block-preview">
          <span className="hint">학생에게 이렇게 보여요</span>
          <ImageGroup images={images} layout={block.layout} />
        </div>
      )}
    </div>
  );
}
