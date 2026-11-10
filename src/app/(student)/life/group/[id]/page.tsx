"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Badge from "@/components/Badge";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import Thumb from "@/components/market/Thumb";
import VerifyGate from "@/components/market/VerifyGate";
import { CHAT_ROOMS_KEY, useChatRooms } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { GROUP_STATUS_LABEL, remaining, unreadLabel, won } from "@/lib/market";
import type { GroupBuyDetail, GroupParticipant } from "@/types";

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const q = useQuery({ queryKey: ["market", "group", id], queryFn: () => api<GroupBuyDetail>(`/market/group-buys/${id}`) });
  const chatRoom = useChatRooms().data?.find((r) => r.type === "GROUP" && r.groupBuyId === Number(id));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["market"] });
    qc.invalidateQueries({ queryKey: CHAT_ROOMS_KEY }); // 참여·취소 시 단체방 입장 여부 변경
  };
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
  const cancel = useMutation({
    mutationFn: () => api(`/market/group-buys/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast("모집을 취소했어요. 결제한 참여자에게 환불돼요.");
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
  const { summary: s, description, mine, participants, paymentRequired, myPaid } = q.data;
  const open = s.status === "RECRUITING";
  const pct = Math.min(100, Math.round((s.joinedQuantity / s.targetQuantity) * 100));
  const left = Math.max(1, s.targetQuantity - s.joinedQuantity);

  return (
    <>
      <div className="life-card life-detail">
        <Thumb src={s.imageUrl} category="LIVING" size={120} faded={!open} />
        <Badge color={open ? "blue" : "elephant"} size="small">
          {open ? remaining(s.deadlineAt) : GROUP_STATUS_LABEL[s.status]}
        </Badge>
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
      {mine && paymentRequired && <Participants id={id} />}
      {chatRoom && (
        <div className="chat-rows single">
          <Link href={`/life/chats/${chatRoom.id}`} className="chat-row">
            <span className="chat-asset">
              <Icon name="chat" size={20} />
            </span>
            <div className="chat-row-body">
              <strong>단체 채팅방</strong>
              <p className="chat-row-sub">{chatRoom.lastMessage ?? "참여자들과 수령 시간·장소를 정해 보세요."}</p>
            </div>
            {chatRoom.unread > 0 && (
              <Badge color="blue" label={`안 읽은 메시지 ${chatRoom.unread}개`}>
                {unreadLabel(chatRoom.unread)}
              </Badge>
            )}
            <span className="chat-row-go">
              <Icon name="chevron" size={18} />
            </span>
          </Link>
        </div>
      )}

      <div className="life-bar">
        {mine ? (
          <>
            {open && (
              <button
                className="life-btn ghost small"
                disabled={cancel.isPending}
                onClick={() => confirm(paymentRequired ? "모집을 취소할까요? 결제한 참여자 모두에게 환불돼요." : "모집을 취소할까요?") && cancel.mutate()}
              >
                모집 취소
              </button>
            )}
            {/* 결제 모집은 목표 수량을 채워야 마감. 미달이면 모집 취소로 환불 */}
            <button
              className="life-btn"
              disabled={!open || close.isPending || (paymentRequired && s.joinedQuantity < s.targetQuantity)}
              onClick={() => confirm("지금 모집을 마감할까요?") && close.mutate()}
            >
              {!open ? GROUP_STATUS_LABEL[s.status] : paymentRequired && s.joinedQuantity < s.targetQuantity ? "목표 수량을 채우면 마감할 수 있어요" : "모집 마감하기"}
            </button>
          </>
        ) : open && paymentRequired && s.myQuantity > 0 ? (
          <>
            <p className="life-paid">
              {myPaid ? `${won(s.unitPrice * s.myQuantity)} 결제 완료` : "참여 중"} <span>· {s.myQuantity}개</span>
            </p>
            <button
              className="life-btn ghost"
              disabled={leave.isPending}
              onClick={() => confirm(myPaid ? `참여를 취소할까요? ${won(s.unitPrice * s.myQuantity)}이 환불돼요.` : "참여를 취소할까요?") && leave.mutate()}
            >
              참여 취소
            </button>
          </>
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
            {paymentRequired ? (
              <button className="life-btn" onClick={() => router.push(`/life/group/${id}/pay?quantity=${qty}`)}>
                {won(s.unitPrice * qty)} 결제하고 참여
              </button>
            ) : (
              <button className="life-btn" disabled={join.isPending} onClick={() => join.mutate()}>
                {s.myQuantity ? `수량 변경 (현재 ${s.myQuantity}개)` : `${won(s.unitPrice * qty)} 참여하기`}
              </button>
            )}
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

/** 주최자 전용: 참여자별 수량과 결제 상태 */
function Participants({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["market", "group", id, "participants"],
    queryFn: () => api<GroupParticipant[]>(`/market/group-buys/${id}/participants`),
  });
  if (!q.data?.length) return null;
  return (
    <div className="life-card">
      <h3 className="life-h3">참여자 {q.data.length}명</h3>
      {q.data.map((p) => (
        <div key={p.nickname + p.joinedAt} className="life-req">
          <div>
            <strong>{p.nickname}</strong>
            <p className="life-sub">{p.quantity}개</p>
          </div>
          <Badge color={p.paid ? "blue" : "elephant"}>{p.paid ? "결제 완료" : "미결제"}</Badge>
        </div>
      ))}
    </div>
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
