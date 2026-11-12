/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/api";

const clampZoom = (value: number) => Math.min(4, Math.max(1, value));

export default function ImageViewer({ images, captions = [], initialIndex = 0, onClose }: {
  images: string[]; captions?: string[]; initialIndex?: number; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [broken, setBroken] = useState<string | null>(null);
  const previousZoom = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, distance: 0, zoom: 1, multi: false });

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    const opener = document.activeElement;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close(); document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const element = stage.current;
    if (element && zoom !== previousZoom.current) {
      const ratio = zoom / previousZoom.current;
      element.scrollLeft = (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2;
      element.scrollTop = (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2;
    }
    previousZoom.current = zoom;
  }, [zoom]);

  const reset = () => { setZoom(1); stage.current?.scrollTo(0, 0); };
  const go = (delta: number) => { setIndex(i => (i + delta + images.length) % images.length); reset(); };
  const caption = captions[index] ?? "";

  return <dialog ref={dialog} className="image-lightbox" aria-label="사진 전체 화면" onCancel={e => { e.preventDefault(); onClose(); }}
    onKeyDown={e => {
      if (images.length <= 1) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    }}>
    <header className="image-lightbox-toolbar">
      <span aria-live="polite">{index + 1} / {images.length}</span>
      <div>
        <button type="button" aria-label="축소" disabled={zoom <= 1} onClick={() => setZoom(z => clampZoom(z - .5))}>−</button>
        <button type="button" aria-label="확대 초기화" onClick={reset}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="확대" disabled={zoom >= 4} onClick={() => setZoom(z => clampZoom(z + .5))}>+</button>
        <button type="button" aria-label="사진 뷰어 닫기" onClick={onClose} autoFocus>×</button>
      </div>
    </header>
    <div ref={stage} className="image-lightbox-stage" tabIndex={0} aria-label="사진 영역, 확대 후 드래그로 이동"
      onDoubleClick={() => zoom === 1 ? setZoom(2) : reset()}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 1) gesture.current = { x: e.clientX, y: e.clientY, distance: 0, zoom, multi: false };
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          gesture.current.distance = Math.hypot(a.x - b.x, a.y - b.y);
          gesture.current.zoom = zoom; gesture.current.multi = true;
        }
      }}
      onPointerMove={e => {
        const previous = pointers.current.get(e.pointerId);
        if (!previous) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && gesture.current.distance > 0) {
          const [a, b] = [...pointers.current.values()];
          setZoom(clampZoom(gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance));
        } else if (zoom > 1) {
          e.currentTarget.scrollLeft += previous.x - e.clientX;
          e.currentTarget.scrollTop += previous.y - e.clientY;
        }
      }}
      onPointerUp={e => {
        pointers.current.delete(e.pointerId);
        if (!pointers.current.size && !gesture.current.multi && zoom === 1) {
          const dx = e.clientX - gesture.current.x, dy = e.clientY - gesture.current.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => { pointers.current.clear(); gesture.current.multi = true; }}>
      {broken === images[index] ? <p className="image-lightbox-error">이미지를 불러올 수 없습니다. 다른 사진을 선택해 주세요.</p> :
        <div className="image-lightbox-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          <img src={assetUrl(images[index])} alt={caption || `사진 ${index + 1}`} draggable={false} onError={() => setBroken(images[index])} />
        </div>}
    </div>
    {images.length > 1 && <div className="image-lightbox-navigation">
      <button type="button" aria-label="이전 사진" onClick={() => go(-1)}>‹</button>
      <button type="button" aria-label="다음 사진" onClick={() => go(1)}>›</button>
    </div>}
    <footer className="image-lightbox-caption" aria-live="polite">{caption || "두 손가락이나 + 버튼으로 확대할 수 있어요."}</footer>
  </dialog>;
}
