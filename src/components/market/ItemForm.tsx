"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import ImagePicker from "@/components/market/ImagePicker";
import { api } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/market";
import type { MarketCategory, MarketItemDetail } from "@/types";

/** 물품 등록과 수정 폼. item이 있으면 그 값으로 채우고 저장 시 수정 요청을 보냄 */
export default function ItemForm({ item }: { item?: MarketItemDetail }) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [images, setImages] = useState<string[]>(item?.imageUrls ?? []);
  const [title, setTitle] = useState(item?.title ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [category, setCategory] = useState<MarketCategory>(item?.category ?? "BOOK");
  const [place, setPlace] = useState(item?.tradePlace ?? "");
  const [desc, setDesc] = useState(item?.description ?? "");
  const [photoError, setPhotoError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api<MarketItemDetail>(item ? `/market/items/${item.id}` : "/market/items", {
        method: item ? "PUT" : "POST",
        body: { title: title.trim(), description: desc.trim(), price: Number(price || 0), category, tradePlace: place.trim() || null, imageUrls: images },
      }),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["market"] });
      toast(item ? "물품 정보를 수정했어요." : "물품을 올렸어요.");
      router.replace(`/life/items/${saved.id}`);
    },
  });

  return (
    <form
      className="life-card life-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!images.length) return setPhotoError("사진을 1장 이상 올려 주세요.");
        save.mutate();
      }}
    >
      <ImagePicker
        urls={images}
        onChange={(u) => {
          setImages(u);
          if (u.length) setPhotoError(null);
        }}
      />
      <InlineError error={photoError} />
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
      <InlineError error={save.error} />
      <button className="life-btn" disabled={!title.trim() || price === "" || save.isPending}>
        {save.isPending ? (item ? "저장하는 중…" : "올리는 중…") : item ? "수정하기" : "올리기"}
      </button>
    </form>
  );
}
