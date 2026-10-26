"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import GroupRow from "@/components/market/GroupRow";
import ItemRow from "@/components/market/ItemRow";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/market";
import { useSession } from "@/lib/session";
import type { GroupBuyPage, MarketCategory, MarketItemPage } from "@/types";

type Tab = "items" | "group";

function Items() {
  const [category, setCategory] = useState<MarketCategory | "">("");
  const [sort, setSort] = useState<"latest" | "price" | "popular">("latest");
  const list = useInfiniteQuery({
    queryKey: ["market", "items", category, sort],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<MarketItemPage>(`/market/items?page=${pageParam}&size=20&sort=${sort}${category ? `&category=${category}` : ""}`),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <div className="life-card">
        <div className="life-chips" role="tablist" aria-label="카테고리">
          <button className={`life-chip ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>
            전체
          </button>
          {CATEGORY_ORDER.map((c) => (
            <button key={c} className={`life-chip ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="life-toolbar">
          <span className="life-sub">판매 중인 물품</span>
          <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="latest">최신순</option>
            <option value="popular">관심순</option>
            <option value="price">낮은 가격순</option>
          </select>
        </div>
        {list.isLoading && <p className="life-empty">불러오는 중…</p>}
        {list.isError && <p className="life-empty">{(list.error as Error).message}</p>}
        {!list.isLoading && !list.isError && items.length === 0 && (
          <p className="life-empty">아직 올라온 물품이 없어요. 첫 물품을 올려 보세요.</p>
        )}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
        {list.hasNextPage && (
          <button className="life-more" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </button>
        )}
      </div>
      <div className="life-fab-wrap">
        <Link href="/life/new" className="life-fab">
          <Icon name="plus" size={18} />
          물품 등록
        </Link>
      </div>
    </>
  );
}

function Groups() {
  const [status, setStatus] = useState<"RECRUITING" | "CLOSED">("RECRUITING");
  const list = useInfiniteQuery({
    queryKey: ["market", "groups", status],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api<GroupBuyPage>(`/market/group-buys?page=${pageParam}&size=20&status=${status}`),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  const groups = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <div className="life-card">
        <div className="life-chips">
          <button className={`life-chip ${status === "RECRUITING" ? "on" : ""}`} onClick={() => setStatus("RECRUITING")}>
            모집 중
          </button>
          <button className={`life-chip ${status === "CLOSED" ? "on" : ""}`} onClick={() => setStatus("CLOSED")}>
            마감
          </button>
        </div>
        {list.isLoading && <p className="life-empty">불러오는 중…</p>}
        {list.isError && <p className="life-empty">{(list.error as Error).message}</p>}
        {!list.isLoading && !list.isError && groups.length === 0 && (
          <p className="life-empty">{status === "RECRUITING" ? "모집 중인 같이 사기가 없어요. 직접 열어 보세요." : "마감된 모집이 없어요."}</p>
        )}
        {groups.map((g) => (
          <GroupRow key={g.id} group={g} />
        ))}
        {list.hasNextPage && (
          <button className="life-more" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            더 보기
          </button>
        )}
      </div>
      <div className="life-fab-wrap">
        <Link href="/life/group/new" className="life-fab">
          <Icon name="plus" size={18} />
          모집 열기
        </Link>
      </div>
    </>
  );
}

export default function LifePage() {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("items");

  return (
    <>
      <header className="life-head">
        <div>
          <h1>
            생활
            {session?.verified && (
              <span className="life-verified">
                <Icon name="shield" size={12} />
                재학생 인증
              </span>
            )}
          </h1>
          <p>가대생끼리 사고팔고, 같이 사요.</p>
        </div>
        {session?.verified && (
          <Link href="/life/my" className="life-link">
            내 거래
          </Link>
        )}
      </header>
      <VerifyGate>
        <div className="life-seg" role="tablist">
          <button role="tab" aria-selected={tab === "items"} className={tab === "items" ? "on" : ""} onClick={() => setTab("items")}>
            중고거래
          </button>
          <button role="tab" aria-selected={tab === "group"} className={tab === "group" ? "on" : ""} onClick={() => setTab("group")}>
            같이 사기
          </button>
        </div>
        {tab === "items" ? <Items /> : <Groups />}
      </VerifyGate>
    </>
  );
}
