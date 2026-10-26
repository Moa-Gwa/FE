"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import ImagePicker from "@/components/market/ImagePicker";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import type { GroupBuyDetail } from "@/types";

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 86_400_000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NewGroupPage() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [target, setTarget] = useState("10");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [place, setPlace] = useState("");
  const [desc, setDesc] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api<GroupBuyDetail>("/market/group-buys", {
        method: "POST",
        body: {
          title: title.trim(),
          description: desc.trim(),
          unitPrice: Number(price || 0),
          targetQuantity: Number(target),
          deadlineAt: new Date(deadline).toISOString(),
          pickupPlace: place.trim() || null,
          imageUrl: images[0] ?? null,
        },
      }),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ["market"] });
      toast("모집을 열었어요.");
      router.replace(`/life/group/${g.summary.id}`);
    },
    onError: (e) => toast(e.message),
  });

  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>같이 사기 열기</h1>
      </div>
      <VerifyGate>
        <form
          className="life-card life-form"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <ImagePicker urls={images} onChange={(u) => setImages(u.slice(0, 1))} max={1} />
          <label>
            무엇을 같이 살까요?
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="예) 블루북 시험지 10권 묶음" required />
          </label>
          <label>
            개당 가격
            <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 9))} required />
          </label>
          <label>
            목표 수량 (2개 이상)
            <input value={target} inputMode="numeric" onChange={(e) => setTarget(e.target.value.replace(/\D/g, "").slice(0, 4))} required />
          </label>
          <label>
            모집 마감
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </label>
          <label>
            수령 장소
            <input value={place} maxLength={100} onChange={(e) => setPlace(e.target.value)} placeholder="예) 학생회관 1층" />
          </label>
          <label>
            설명
            <textarea value={desc} maxLength={2000} rows={4} onChange={(e) => setDesc(e.target.value)} />
          </label>
          <button className="life-btn" disabled={!title.trim() || !price || Number(target) < 2 || create.isPending}>
            {create.isPending ? "여는 중…" : "모집 열기"}
          </button>
        </form>
      </VerifyGate>
    </>
  );
}
