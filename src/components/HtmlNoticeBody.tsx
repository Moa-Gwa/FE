"use client";

import { useEffect, useRef, useState } from "react";
import ImageViewer from "@/components/ImageViewer";

// 백엔드 BoardParser와 같은 기준: 아이콘·로고·여백용 경로이거나 32px 이하 이미지는 장식으로 봄
const DECORATIVE_PATH = /(?:^|[/_.-])(?:icon|ico|logo|blank|spacer|transparent|pixel)(?:[/_.0-9-]|$)/;
const STYLE_SIZE = /(?:width|height)\s*:\s*(\d+)px/gi;
const SMALL = 32;

function decorative(img: HTMLImageElement): boolean {
  let path = "";
  try {
    path = new URL(img.src).pathname.toLowerCase();
  } catch {
    return true;
  }
  if (DECORATIVE_PATH.test(path)) return true;
  const sizes = ["width", "height"].map((name) => img.getAttribute(name)?.trim() ?? "");
  if (sizes.some((v) => /^\d+(px)?$/.test(v) && parseInt(v, 10) <= SMALL)) return true;
  return [...(img.getAttribute("style") ?? "").matchAll(STYLE_SIZE)].some((m) => Number(m[1]) <= SMALL);
}

/** 확대 대상인 본문 사진. 장식용 이미지는 제외함 */
const photosIn = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLImageElement>("img[src]")].filter((img) => !decorative(img));

/** 사진만 감싼 링크는 링크 자체를 누름 대상으로 쓰고, 그 외에는 사진에 버튼 역할을 붙임 */
function triggerOf(img: HTMLImageElement): HTMLElement {
  const anchor = img.closest("a");
  const imageOnlyLink = anchor && anchor.querySelectorAll("img").length === 1 && !anchor.textContent?.trim();
  return imageOnlyLink ? anchor : img;
}

const TRIGGER_ATTRS = ["role", "tabindex", "aria-label", "data-notice-image"];

/** Only accepts the backend's sanitized board HTML. */
export default function HtmlNoticeBody({ html }: { html: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<{ images: string[]; alts: string[]; index: number } | null>(null);

  // 본문 사진을 키보드로도 열 수 있게 버튼 역할을 붙이고, 언마운트 시 원래 속성으로 되돌림
  useEffect(() => {
    if (!body.current) return;
    const restore = photosIn(body.current).map((img, index) => {
      const target = triggerOf(img);
      const original = TRIGGER_ATTRS.map((name) => target.getAttribute(name));
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-label", `사진 ${index + 1} 크게 보기`);
      target.setAttribute("data-notice-image", String(index));
      return () =>
        TRIGGER_ATTRS.forEach((name, i) => {
          const value = original[i];
          if (value === null) target.removeAttribute(name);
          else target.setAttribute(name, value);
        });
    });
    return () => restore.forEach((fn) => fn());
  }, [html]);

  const open = (target: EventTarget | null) => {
    if (!(target instanceof Element) || !body.current) return false;
    const trigger = target.closest<HTMLElement>("[data-notice-image]");
    if (!trigger || !body.current.contains(trigger)) return false;
    const photos = photosIn(body.current);
    const index = Number(trigger.dataset.noticeImage);
    if (!photos[index]) return false;
    // 학교 게시판의 alt는 파일명인 경우가 많아 설명으로 보여 주지 않고 대체 텍스트로만 씀
    setViewer({ images: photos.map((img) => img.currentSrc || img.src), alts: photos.map((img) => img.alt), index });
    return true;
  };

  const handled = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <>
      <div
        ref={body}
        className="html-body"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          if (open(e.target)) handled(e);
        }}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && open(e.target)) handled(e);
        }}
      />
      {viewer && (
        <ImageViewer
          images={viewer.images}
          alts={viewer.alts}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
