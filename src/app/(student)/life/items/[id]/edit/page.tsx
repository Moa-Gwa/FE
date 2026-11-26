"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { goBack } from "@/lib/backNav";
import Icon from "@/components/Icon";
import ItemForm from "@/components/market/ItemForm";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import type { MarketItemDetail } from "@/types";

function Edit({ id }: { id: string }) {
  const item = useQuery({ queryKey: ["market", "item", id], queryFn: () => api<MarketItemDetail>(`/market/items/${id}`) });
  if (item.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (item.isError || !item.data) return <p className="life-empty">{(item.error as Error)?.message ?? "물품을 찾을 수 없어요."}</p>;
  if (!item.data.mine) return <p className="life-empty">내가 올린 물품만 수정할 수 있어요.</p>;
  return <ItemForm item={item.data} />;
}

export default function EditItemPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => goBack(router, "/life")} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>물품 수정</h1>
      </div>
      <VerifyGate>
        <Edit id={id} />
      </VerifyGate>
    </>
  );
}
