import ImageGroup from "@/components/ImageGroup";
import type { Block } from "@/types";

/** Renders a blog-style notice body in the order the author arranged it. Text is plain text, never HTML. */
export default function BlocksView({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blocks-view">
      {blocks.map((b, i) =>
        b.type === "TEXT" ? (
          <p key={i} className="blk-text">
            {b.text}
          </p>
        ) : (
          <ImageGroup key={i} images={b.images} layout={b.layout} />
        ),
      )}
    </div>
  );
}
