/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/api";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const SWIPE_PX = 50;

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

type Point = { x: number; y: number };
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 사진 전체 화면 뷰어. 확대·축소, 확대 후 드래그 이동, 두 손가락 확대, 좌우 넘김을 지원함.
 * captions는 아래에 설명으로 보여 주고, alts는 설명 없이 대체 텍스트로만 씀
 */
export default function ImageViewer({
  images,
  captions = [],
  alts = [],
  initialIndex = 0,
  onClose,
}: {
  images: string[];
  captions?: string[];
  alts?: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [broken, setBroken] = useState<string | null>(null);
  const previousZoom = useRef(MIN_ZOOM);
  const pointers = useRef(new Map<number, Point>());
  // 한 번의 터치·드래그 동안의 시작 위치, 두 손가락 시작 거리와 그때의 배율
  const gesture = useRef({ start: { x: 0, y: 0 }, distance: 0, zoom: MIN_ZOOM, multi: false });

  // 열 때 모달로 띄우고 페이지 스크롤을 막음. 닫을 때 스크롤과 여는 데 쓴 버튼의 초점을 되돌림
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    const opener = document.activeElement;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // 배율이 바뀌어도 화면 가운데 지점이 그대로 보이도록 스크롤 위치를 맞춤
  useLayoutEffect(() => {
    const element = stage.current;
    if (element && zoom !== previousZoom.current) {
      const ratio = zoom / previousZoom.current;
      element.scrollLeft = (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2;
      element.scrollTop = (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2;
    }
    previousZoom.current = zoom;
  }, [zoom]);

  const reset = () => {
    setZoom(MIN_ZOOM);
    stage.current?.scrollTo(0, 0);
  };

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
    reset();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (images.length <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current = { start: { x: e.clientX, y: e.clientY }, distance: 0, zoom, multi: false };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { ...gesture.current, distance: distance(a, b), zoom, multi: true };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gesture.current.distance > 0) {
      // 두 손가락: 처음 거리 대비 지금 거리만큼 확대
      const [a, b] = [...pointers.current.values()];
      setZoom(clampZoom((gesture.current.zoom * distance(a, b)) / gesture.current.distance));
    } else if (zoom > MIN_ZOOM) {
      // 확대된 상태의 한 손가락·마우스: 사진을 끌어서 이동
      e.currentTarget.scrollLeft += previous.x - e.clientX;
      e.currentTarget.scrollTop += previous.y - e.clientY;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    // 확대하지 않은 상태에서 한 손가락으로 좌우로 밀면 다음·이전 사진
    if (pointers.current.size > 0 || gesture.current.multi || zoom !== MIN_ZOOM) return;
    const dx = e.clientX - gesture.current.start.x;
    const dy = e.clientY - gesture.current.start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const onPointerCancel = () => {
    pointers.current.clear();
    gesture.current.multi = true;
  };

  const caption = captions[index] ?? "";
  const alt = caption || alts[index] || `사진 ${index + 1}`;

  return (
    <dialog
      ref={dialog}
      className="image-lightbox"
      aria-label="사진 전체 화면"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <header className="image-lightbox-toolbar">
        <span aria-live="polite">
          {index + 1} / {images.length}
        </span>
        <div>
          <button
            type="button"
            aria-label="축소"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          >
            −
          </button>
          <button type="button" aria-label="확대 초기화" onClick={reset}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="확대"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          >
            +
          </button>
          <button type="button" aria-label="사진 뷰어 닫기" onClick={onClose} autoFocus>
            ×
          </button>
        </div>
      </header>

      <div
        ref={stage}
        className="image-lightbox-stage"
        tabIndex={0}
        aria-label="사진 영역, 확대 후 드래그로 이동"
        onDoubleClick={() => (zoom === MIN_ZOOM ? setZoom(2) : reset())}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {broken === images[index] ? (
          <p className="image-lightbox-error">이미지를 불러올 수 없습니다. 다른 사진을 선택해 주세요.</p>
        ) : (
          <div className="image-lightbox-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <img
              src={assetUrl(images[index])}
              alt={alt}
              draggable={false}
              onError={() => setBroken(images[index])}
            />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="image-lightbox-navigation">
          <button type="button" aria-label="이전 사진" onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" aria-label="다음 사진" onClick={() => go(1)}>
            ›
          </button>
        </div>
      )}

      <footer className="image-lightbox-caption" aria-live="polite">
        {caption || "두 손가락이나 + 버튼으로 확대할 수 있어요."}
      </footer>
    </dialog>
  );
}
