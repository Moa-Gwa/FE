/* eslint-disable @next/next/no-img-element */
import Carousel from "@/components/Carousel";
import { assetUrl } from "@/lib/api";
import type { BlockLayout } from "@/types";

/** A group of images shown either as a swipeable slideshow or stacked top to bottom. */
export default function ImageGroup({ images, layout }: { images: string[]; layout: BlockLayout }) {
  if (images.length === 0) return null;
  if (layout === "STACK" || images.length === 1) {
    return (
      <div className="image-stack">
        {images.map((url, i) => (
          <img key={`${url}-${i}`} src={assetUrl(url)} alt={`이미지 ${i + 1}`} />
        ))}
      </div>
    );
  }
  return <Carousel images={images} />;
}
