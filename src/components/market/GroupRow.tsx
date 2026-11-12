"use client";

import Link from "next/link";
import Thumb from "@/components/market/Thumb";
import { closingSoon, GROUP_STATUS_LABEL, remaining, won } from "@/lib/market";
import type { GroupBuySummary } from "@/types";

export default function GroupRow({ group }: { group: GroupBuySummary }) {
  const pct = Math.min(100, Math.round((group.joinedQuantity / group.targetQuantity) * 100));
  const open = group.status === "RECRUITING";
  const urgent = open && closingSoon(group.deadlineAt);
  return (
    <Link href={`/life/group/${group.id}`} className={`life-item ${open ? "" : "closed"}`}>
      <Thumb src={group.imageUrl} category="LIVING" faded={!open} />
      <div className="life-item-body">
        <h3 className={open ? "" : "muted"}>{group.title}</h3>
        <p className="life-sub">
          <span className={urgent ? "life-due" : ""}>{open ? remaining(group.deadlineAt) : GROUP_STATUS_LABEL[group.status]}</span>
        </p>
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
