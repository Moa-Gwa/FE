"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import ImagePicker from "@/components/market/ImagePicker";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/market";
import type { MarketCategory, MarketItemDetail } from "@/types";

export default function NewItemPage() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<MarketCategory>("BOOK");
  const [place, setPlace] = useState("");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api<MarketItemDetail>("/market/items", {
        method: "POST",
        body: { title: title.trim(), description: desc.trim(), price: Number(price || 0), category, tradePlace: place.trim() || null, imageUrls: images },
      }),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["market"] });
      toast("물품을 올렸어요.");
      router.replace(`/life/items/${item.id}`);
    },
    onError: (e) => toast(e.message),
  });

  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>물품 등록</h1>
      </div>
      <VerifyGate>
        <form
          className="life-card life-form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <ImagePicker urls={images} onChange={setImages} />
          <label>
            제목
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="무엇을 파시나요?" required />
          </label>
          <div className="life-label">카테고리</div>
          <div className="life-chips">
            {CATEGORY_ORDER.map((c) => (
              <button type="button" key={c} className={`life-chip ${category === c ? "on" : ""}`} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
          <label>
            가격 (0원이면 나눔)
            <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="0" required />
          </label>
          <label>
            거래 희망 장소
            <input value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="예) 학생회관 앞" />
          </label>
          <label>
            설명
            <textarea value={desc} maxLength={2000} rows={5} onChange={(e) => setDesc(e.target.value)} placeholder="상태, 사용 기간, 구매 시기를 적어 주세요." />
          </label>
          <button className="life-btn" disabled={!title.trim() || price === "" || create.isPending}>
            {create.isPending ? "올리는 중…" : "올리기"}
          </button>
        </form>
      </VerifyGate>
    </>
  );
}
