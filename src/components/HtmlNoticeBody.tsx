"use client";

import { useEffect, useRef, useState } from "react";
import ImageViewer from "@/components/ImageViewer";

/** Only accepts the backend's sanitized board HTML. */
export default function HtmlNoticeBody({ html }: { html: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<{ images: string[]; captions: string[]; index: number } | null>(null);

  useEffect(() => {
    const restore: (() => void)[] = [];
    body.current?.querySelectorAll<HTMLImageElement>("img[src]").forEach((img, index) => {
      const anchor = img.closest("a");
      // Image-only links use their existing focus target, rather than nesting another button.
      const target = anchor && anchor.querySelectorAll("img").length === 1 && !anchor.textContent?.trim() ? anchor : img;
      const attrs = ["role", "tabindex", "aria-label", "data-notice-image"];
      const original = attrs.map(name => target.getAttribute(name));
      target.setAttribute("role", "button");
      target.setAttribute("tabindex", "0");
      target.setAttribute("aria-label", `사진 ${index + 1} 크게 보기`);
      target.setAttribute("data-notice-image", String(index));
      restore.push(() => attrs.forEach((name, i) => original[i] === null ? target.removeAttribute(name) : target.setAttribute(name, original[i]!)));
    });
    return () => restore.forEach(fn => fn());
  }, [html]);

  const open = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    const trigger = target.closest<HTMLElement>("[data-notice-image]");
    if (!trigger || !body.current?.contains(trigger)) return false;
    const images = [...body.current.querySelectorAll<HTMLImageElement>("img[src]")];
    const index = Number(trigger.dataset.noticeImage);
    if (!images[index]) return false;
    setViewer({ images: images.map(img => img.currentSrc || img.src), captions: images.map(img => img.alt || ""), index });
    return true;
  };

  return <>
    <div ref={body} className="html-body" dangerouslySetInnerHTML={{ __html: html }}
      onClick={e => { if (open(e.target)) { e.preventDefault(); e.stopPropagation(); } }}
      onKeyDown={e => {
        if ((e.key === "Enter" || e.key === " ") && open(e.target)) { e.preventDefault(); e.stopPropagation(); }
      }} />
    {viewer && <ImageViewer images={viewer.images} captions={viewer.captions} initialIndex={viewer.index} onClose={() => setViewer(null)} />}
  </>;
}
