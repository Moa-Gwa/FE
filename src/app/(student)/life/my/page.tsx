"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { goBack } from "@/lib/backNav";
import { useState } from "react";
import Icon from "@/components/Icon";
import Badge from "@/components/Badge";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
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

/** 내가 보낸 거래 요청. 대기 중이거나 수락된 요청은 취소할 수 있음(거래 완료 후 취소는 서버가 거부) */
function RequestRow({ r }: { r: TradeRequestView }) {
  const toast = useToast();
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api<void>(`/market/requests/${r.id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast("거래 요청을 취소했어요.");
      qc.invalidateQueries({ queryKey: ["market"] });
    },
  });
  const cancellable = r.status === "PENDING" || r.status === "ACCEPTED";
  return (
    <>
      <div className="life-req">
        <Link href={`/life/items/${r.itemId}`} className="life-req-main">
          <strong>{r.itemTitle}</strong>
          <p className="life-sub">{timeAgo(r.createdAt)}</p>
        </Link>
        <div className="life-req-actions">
          <Badge color={r.status === "ACCEPTED" ? "blue" : "elephant"}>{REQUEST_LABEL[r.status]}</Badge>
          {cancellable && (
            <button
              className="life-btn small ghost"
              disabled={cancel.isPending}
              onClick={() => confirm(r.status === "ACCEPTED" ? "수락된 거래를 취소할까요? 물품이 다시 판매 중으로 바뀌어요." : "이 거래 요청을 취소할까요?") && cancel.mutate()}
            >
              취소
            </button>
          )}
        </div>
      </div>
      <InlineError error={cancel.error} />
    </>
  );
}

function Body({ tab }: { tab: Tab }) {
  const q = useQuery({
    queryKey: ["market", "me", tab],
    queryFn: () => api<(MarketItemSummary | TradeRequestView | GroupBuySummary)[]>(`/me/market/${tab === "groups" ? "group-buys" : tab}`),
  });
  const rows = q.data ?? [];
  if (q.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (q.isError) return <p className="life-empty">{(q.error as Error).message}</p>;
  if (!rows.length) return <p className="life-empty">아직 내역이 없어요.</p>;
  // 내 물품은 거래 중 / 거래 완료로 묶어 묶음 제목이 상태를 대신함
  if (tab === "items") {
    const items = rows as MarketItemSummary[];
    const groups: [string, MarketItemSummary[]][] = [
      ["거래 중", items.filter((i) => i.status !== "SOLD")],
      ["거래 완료", items.filter((i) => i.status === "SOLD")],
    ];
    return (
      <>
        {groups
          .filter(([, list]) => list.length)
          .map(([title, list]) => (
            <section key={title} className="life-group">
              <h2 className="life-group-title">
                {title} <span>{list.length}</span>
              </h2>
              <div className="life-card">
                {list.map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </div>
            </section>
          ))}
      </>
    );
  }
  return (
    <div className="life-card">
      {rows.map((r) =>
        tab === "requests" ? (
          <RequestRow key={r.id} r={r as TradeRequestView} />
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
        <button className="life-back" onClick={() => goBack(router, "/life")} aria-label="뒤로">
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
