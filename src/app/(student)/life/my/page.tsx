"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import GroupRow from "@/components/market/GroupRow";
import ItemRow from "@/components/market/ItemRow";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import { REQUEST_LABEL, timeAgo } from "@/lib/market";
import type { GroupBuySummary, MarketItemSummary, TradeRequestView } from "@/types";

type Tab = "items" | "likes" | "requests" | "groups";
const TABS: [Tab, string][] = [
  ["items", "내 물품"],
  ["likes", "관심"],
  ["requests", "내 요청"],
  ["groups", "같이 사기"],
];

function Body({ tab }: { tab: Tab }) {
  const q = useQuery({
    queryKey: ["market", "me", tab],
    queryFn: () => api<(MarketItemSummary | TradeRequestView | GroupBuySummary)[]>(`/me/market/${tab === "groups" ? "group-buys" : tab}`),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (q.isError) return <p className="life-empty">{(q.error as Error).message}</p>;
  if (!rows.length) return <p className="life-empty">아직 내역이 없어요.</p>;
  return (
    <div className="life-card">
      {rows.map((r) =>
        tab === "requests" ? (
          <Link key={r.id} href={`/life/items/${(r as TradeRequestView).itemId}`} className="life-req link">
            <div>
              <strong>{(r as TradeRequestView).itemTitle}</strong>
              <p className="life-sub">{timeAgo((r as TradeRequestView).createdAt)}</p>
            </div>
            <span className={`life-pill ${(r as TradeRequestView).status === "ACCEPTED" ? "on_sale" : "sold"}`}>{REQUEST_LABEL[(r as TradeRequestView).status]}</span>
          </Link>
        ) : tab === "groups" ? (
          <GroupRow key={r.id} group={r as GroupBuySummary} />
        ) : (
          <ItemRow key={r.id} item={r as MarketItemSummary} />
        ),
      )}
    </div>
  );
}

export default function MyMarketPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("items");
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>내 거래</h1>
      </div>
      <VerifyGate>
        <div className="life-chips pad">
          {TABS.map(([k, label]) => (
            <button key={k} className={`life-chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </div>
        <Body tab={tab} />
      </VerifyGate>
    </>
  );
}
