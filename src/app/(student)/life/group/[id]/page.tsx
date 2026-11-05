"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import Thumb from "@/components/market/Thumb";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import { GROUP_STATUS_LABEL, remaining, won } from "@/lib/market";
import type { GroupBuyDetail } from "@/types";

function Detail({ id }: { id: string }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const q = useQuery({ queryKey: ["market", "group", id], queryFn: () => api<GroupBuyDetail>(`/market/group-buys/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["market"] });
  const onError = (e: Error) => toast(e.message);
  const join = useMutation({
    mutationFn: () => api<GroupBuyDetail>(`/market/group-buys/${id}/join`, { method: "POST", body: { quantity: qty } }),
    onSuccess: () => {
      toast("참여했어요.");
      refresh();
    },
    onError,
  });
  const leave = useMutation({
    mutationFn: () => api<void>(`/market/group-buys/${id}/join`, { method: "DELETE" }),
    onSuccess: () => {
      toast("참여를 취소했어요.");
      refresh();
    },
    onError,
  });
  const close = useMutation({
    mutationFn: () => api(`/market/group-buys/${id}/close`, { method: "POST" }),
    onSuccess: () => {
      toast("모집을 마감했어요.");
      refresh();
    },
    onError,
  });

  if (q.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (q.isError || !q.data) return <p className="life-empty">{(q.error as Error)?.message ?? "모집을 찾을 수 없어요."}</p>;
  const { summary: s, description, mine, participants } = q.data;
  const open = s.status === "RECRUITING";
  const pct = Math.min(100, Math.round((s.joinedQuantity / s.targetQuantity) * 100));
  const left = Math.max(1, s.targetQuantity - s.joinedQuantity);

  return (
    <>
      <div className="life-card life-detail">
        <Thumb src={s.imageUrl} category="LIVING" size={120} faded={!open} />
        <span className={`life-pill ${open ? "on_sale" : "sold"}`}>{open ? remaining(s.deadlineAt) : GROUP_STATUS_LABEL[s.status]}</span>
        <h2>{s.title}</h2>
        <p className="life-sub">주최 {s.hostNickname} · 참여 {participants}명</p>
        <strong className="life-price">개당 {won(s.unitPrice)}</strong>
        <div className="life-progress big">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="life-sub">
          {s.joinedQuantity}/{s.targetQuantity}개 모였어요
          {s.joinedQuantity >= s.targetQuantity && " · 목표 달성"}
        </p>
        {s.pickupPlace && (
          <p className="life-place">
            <Icon name="pin" size={14} /> {s.pickupPlace}
          </p>
        )}
        <p className="life-desc">{description || "설명이 없어요."}</p>
      </div>

      <div className="life-bar">
        {mine ? (
          <button className="life-btn" disabled={!open || close.isPending} onClick={() => confirm("지금 모집을 마감할까요?") && close.mutate()}>
            {open ? "모집 마감하기" : GROUP_STATUS_LABEL[s.status]}
          </button>
        ) : open ? (
          <>
            <div className="life-qty">
              <button type="button" aria-label="수량 줄이기" onClick={() => setQty(Math.max(1, qty - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" aria-label="수량 늘리기" onClick={() => setQty(Math.min(20, left, qty + 1))}>
                +
              </button>
            </div>
            <button className="life-btn" disabled={join.isPending} onClick={() => join.mutate()}>
              {s.myQuantity ? `수량 변경 (현재 ${s.myQuantity}개)` : `${won(s.unitPrice * qty)} 참여하기`}
            </button>
            {s.myQuantity > 0 && (
              <button className="life-btn ghost small" onClick={() => leave.mutate()}>
                취소
              </button>
            )}
          </>
        ) : (
          <button className="life-btn" disabled>
            {GROUP_STATUS_LABEL[s.status]}
          </button>
        )}
      </div>
    </>
  );
}

export default function GroupPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>같이 사기</h1>
      </div>
      <VerifyGate>
        <Detail id={id} />
      </VerifyGate>
    </>
  );
}
