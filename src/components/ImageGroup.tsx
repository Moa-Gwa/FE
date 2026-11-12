/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Carousel from "@/components/Carousel";
import ImageViewer from "@/components/ImageViewer";
import { assetUrl } from "@/lib/api";
import type { BlockLayout } from "@/types";

export default function ImageGroup({ images, layout, captions = [] }: { images: string[]; layout: BlockLayout; captions?: string[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!images.length) return null;
  if (layout !== "STACK" && images.length > 1) return <Carousel images={images} captions={captions} />;
  return <>
    <div className="image-stack">
      {images.map((url, i) => <figure key={`${url}-${i}`}>
        <button type="button" className="image-open" aria-label={`사진 ${i + 1} 크게 보기`} onClick={() => setSelected(i)}>
          <img src={assetUrl(url)} alt={captions[i] || `사진 ${i + 1}`} />
        </button>
        {captions[i] && <figcaption className="image-caption">{captions[i]}</figcaption>}
      </figure>)}
    </div>
    {selected !== null && <ImageViewer images={images} captions={captions} initialIndex={selected} onClose={() => setSelected(null)} />}
  </>;
}
