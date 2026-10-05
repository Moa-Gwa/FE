/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { assetUrl } from "@/lib/api";

/** Card-news image viewer: arrow buttons, swipe, and a "n / total" counter. */
export default function Carousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  if (images.length === 0) return null;

  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div
      className="carousel"
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}
    >
      <img src={assetUrl(images[index])} alt={`카드뉴스 ${index + 1}`} />
      {images.length > 1 && (
        <>
          <button className="nav-btn prev" aria-label="이전 이미지" onClick={() => go(-1)}>
            ‹
          </button>
          <button className="nav-btn next" aria-label="다음 이미지" onClick={() => go(1)}>
            ›
          </button>
          <span className="count">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}
