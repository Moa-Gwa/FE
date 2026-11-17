"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/Badge";
import Icon from "@/components/Icon";
import GroupRow from "@/components/market/GroupRow";
import ItemRow from "@/components/market/ItemRow";
import VerifyGate from "@/components/market/VerifyGate";
import { useChatRooms } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_ORDER, unreadLabel } from "@/lib/market";
import { useSession } from "@/lib/session";
import type { GroupBuyPage, MarketCategory, MarketItemPage } from "@/types";

type Tab = "items" | "group";
type Sort = "latest" | "popular" | "price";
const SORT_LABEL: Record<Sort, string> = { latest: "최신순", popular: "관심순", price: "낮은 가격순" };

function MarketSearch({ label, onSearch }: { label: string; onSearch: (query: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form className="life-search" role="search" aria-label={label} onSubmit={(e) => {
      e.preventDefault();
      onSearch(value.trim());
    }}>
      <Icon name="search" size={18} />
      <input type="search" aria-label={label} placeholder={label} value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (!e.target.value) onSearch("");
        }} />
      {value && <button type="button" onClick={() => { setValue(""); onSearch(""); }}>초기화</button>}
      <button type="submit">검색</button>
    </form>
  );
}

function Items() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketCategory | "">("");
  const [sort, setSort] = useState<Sort>("latest");
  const [sorting, setSorting] = useState(false);
  const list = useInfiniteQuery({
    queryKey: ["market", "items", category, sort, query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<MarketItemPage>(`/market/items?page=${pageParam}&size=20&status=ON_SALE,RESERVED&sort=${sort}&q=${encodeURIComponent(query)}${category ? `&category=${category}` : ""}`),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <MarketSearch label="중고거래 제목·내용 검색" onSearch={setQuery} />
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
          <span className="life-sub">판매 중, 예약 중 물품</span>
          <button className="pill-link" onClick={() => setSorting(true)} aria-haspopup="dialog">
            {SORT_LABEL[sort]}
            <Icon name="down" size={14} />
          </button>
        </div>
        {list.isLoading && <p className="life-empty">불러오는 중…</p>}
        {list.isError && <p className="life-empty">{(list.error as Error).message}</p>}
        {!list.isLoading && !list.isError && items.length === 0 && (
          <p className="life-empty">{query ? "검색 결과가 없어요. 다른 검색어를 입력해 보세요." : "아직 올라온 물품이 없어요. 첫 물품을 올려 보세요."}</p>
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
      {sorting && (
        <div className="sheet-back" onClick={() => setSorting(false)}>
          <section className="sheet" role="dialog" aria-modal="true" aria-label="정렬" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>정렬</h2>
            <div className="radio-list">
              {(Object.keys(SORT_LABEL) as Sort[]).map((value) => (
                <label key={value}>
                  {SORT_LABEL[value]}
                  <input
                    type="radio"
                    name="life-sort"
                    checked={sort === value}
                    onChange={() => {
                      setSort(value);
                      setSorting(false);
                    }}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      )}
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"RECRUITING" | "CLOSED">("RECRUITING");
  const list = useInfiniteQuery({
    queryKey: ["market", "groups", status, query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api<GroupBuyPage>(`/market/group-buys?page=${pageParam}&size=20&status=${status}&q=${encodeURIComponent(query)}`),
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
  });
  const groups = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <MarketSearch label="같이 사기 제목·내용 검색" onSearch={setQuery} />
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
          <p className="life-empty">{query ? "검색 결과가 없어요. 다른 검색어를 입력해 보세요." : status === "RECRUITING" ? "모집 중인 같이 사기가 없어요. 직접 열어 보세요." : "마감된 모집이 없어요."}</p>
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
  const unread = useChatRooms().data?.reduce((sum, r) => sum + r.unread, 0) ?? 0;

  return (
    <>
      <header className="life-head">
        <div>
          <h1>생활</h1>
          <p>가대생끼리 사고팔고, 같이 사요.</p>
        </div>
        {session?.verified && (
          <div className="life-head-links">
            <Link href="/life/chats" className="life-link chat-link">
              채팅
              {unread > 0 && (
                <Badge color="blue" label={`안 읽은 메시지 ${unread}개`}>
                  {unreadLabel(unread)}
                </Badge>
              )}
            </Link>
            <Link href="/life/my" className="life-link">
              내 거래
            </Link>
          </div>
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
