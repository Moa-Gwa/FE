/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import ImageViewer from "@/components/ImageViewer";
import { assetUrl } from "@/lib/api";

/** Card-news image viewer: arrow buttons, swipe, and a "n / total" counter. Tapping the image opens it full screen. */
export default function Carousel({ images, captions = [] }: { images: string[]; captions?: string[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const startX = useRef<number | null>(null);
  // 스와이프로 넘긴 직후 따라오는 click은 뷰어를 열지 않음
  const swiped = useRef(false);
  if (images.length === 0) return null;

  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  const openViewer = () => {
    if (!swiped.current) setSelected(index);
    swiped.current = false;
  };

  return (
    <>
      <div
        className="carousel"
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          swiped.current = false;
        }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
          startX.current = null;
        }}
      >
        <button type="button" className="image-open" aria-label={`사진 ${index + 1} 크게 보기`} onClick={openViewer}>
          <img src={assetUrl(images[index])} alt={captions[index] || `사진 ${index + 1}`} />
        </button>
        {images.length > 1 && (
          <>
            <button type="button" className="nav-btn prev" aria-label="이전 이미지" onClick={() => go(-1)}>
              ‹
            </button>
            <button type="button" className="nav-btn next" aria-label="다음 이미지" onClick={() => go(1)}>
              ›
            </button>
            <span className="count">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {captions[index] && <p className="image-caption">{captions[index]}</p>}
      {selected !== null && (
        <ImageViewer images={images} captions={captions} initialIndex={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
