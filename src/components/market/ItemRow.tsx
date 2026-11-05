"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import Thumb from "@/components/market/Thumb";
import { STATUS_LABEL, timeAgo, won } from "@/lib/market";
import type { MarketItemSummary } from "@/types";

export default function ItemRow({ item }: { item: MarketItemSummary }) {
  const sold = item.status === "SOLD";
  return (
    <Link href={`/life/items/${item.id}`} className="life-item">
      <Thumb src={item.thumbnail} category={item.category} faded={sold} />
      <div className="life-item-body">
        <span className={`life-pill ${item.status.toLowerCase()}`}>{STATUS_LABEL[item.status]}</span>
        <h3 className={sold ? "muted" : ""}>{item.title}</h3>
        <p className="life-sub">{[timeAgo(item.createdAt), item.tradePlace].filter(Boolean).join(" · ")}</p>
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
