/* eslint-disable @next/next/no-img-element */
import Icon from "@/components/Icon";
import { assetUrl } from "@/lib/api";
import type { MarketCategory } from "@/types";

const ICON = { BOOK: "book", ELECTRONICS: "compass", LIVING: "bag", CLOTHES: "tag", ETC: "gift" } as const;
const TINT: Record<MarketCategory, string> = {
  BOOK: "#7FA8F0",
  ELECTRONICS: "#6FC3C9",
  LIVING: "#8FCB9B",
  CLOTHES: "#F2C879",
  ETC: "#B3A2E8",
};

/** 사진이 없으면 카테고리 색과 아이콘으로 대신한다. */
export default function Thumb({ src, category, size = 88, faded = false }: { src?: string | null; category: MarketCategory; size?: number; faded?: boolean }) {
  return (
    <span className={`life-thumb ${faded ? "faded" : ""}`} style={{ width: size, height: size, background: TINT[category] }}>
      {src ? <img src={assetUrl(src)} alt="" /> : <Icon name={ICON[category]} size={Math.round(size * 0.36)} />}
    </span>
  );
}
