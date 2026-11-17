"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import Thumb from "@/components/market/Thumb";
import { CATEGORY_LABEL, STATUS_LABEL, timeAgo, won } from "@/lib/market";
import type { MarketItemSummary } from "@/types";

export default function ItemRow({ item }: { item: MarketItemSummary }) {
  const sold = item.status === "SOLD";
  return (
    <Link href={`/life/items/${item.id}`} className="life-item">
      <Thumb src={item.thumbnail} veil={item.status === "ON_SALE" ? undefined : STATUS_LABEL[item.status]} />
      <div className="life-item-body">
        <h3 className={sold ? "muted" : ""}>{item.title}</h3>
        <p className="life-sub">{[CATEGORY_LABEL[item.category], timeAgo(item.createdAt), item.tradePlace].filter(Boolean).join(" · ")}</p>
        <div className="life-item-foot">
          <strong className={sold ? "muted" : ""}>{won(item.price)}</strong>
          <span className="life-likes">
            <Icon name="heart" size={14} />
            {item.likeCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
