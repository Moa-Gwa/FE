"use client";

import Link from "next/link";
import Thumb from "@/components/market/Thumb";
import { GROUP_STATUS_LABEL, remaining, won } from "@/lib/market";
import type { GroupBuySummary } from "@/types";

export default function GroupRow({ group }: { group: GroupBuySummary }) {
  const pct = Math.min(100, Math.round((group.joinedQuantity / group.targetQuantity) * 100));
  const open = group.status === "RECRUITING";
  return (
    <Link href={`/life/group/${group.id}`} className="life-item">
      <Thumb src={group.imageUrl} category="LIVING" faded={!open} />
      <div className="life-item-body">
        <span className={`life-pill ${open ? "on_sale" : "sold"}`}>{open ? remaining(group.deadlineAt) : GROUP_STATUS_LABEL[group.status]}</span>
        <h3 className={open ? "" : "muted"}>{group.title}</h3>
        <div className="life-progress" aria-label={`${group.joinedQuantity}/${group.targetQuantity}개 모집`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="life-item-foot">
          <strong>{won(group.unitPrice)}</strong>
          <span className="life-sub">
            {group.joinedQuantity}/{group.targetQuantity}개
          </span>
        </div>
      </div>
    </Link>
  );
}
