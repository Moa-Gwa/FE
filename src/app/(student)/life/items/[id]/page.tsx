"use client";
/* eslint-disable @next/next/no-img-element */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import Thumb from "@/components/market/Thumb";
import VerifyGate from "@/components/market/VerifyGate";
import { api, assetUrl } from "@/lib/api";
import { CATEGORY_LABEL, REQUEST_LABEL, STATUS_LABEL, timeAgo, won } from "@/lib/market";
import type { MarketItemDetail, MarketStatus, TradeRequestView } from "@/types";

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const key = ["market", "item", id];
  const item = useQuery({ queryKey: key, queryFn: () => api<MarketItemDetail>(`/market/items/${id}`) });
  const mine = item.data?.mine;
  const requests = useQuery({
    queryKey: [...key, "requests"],
    queryFn: () => api<TradeRequestView[]>(`/market/items/${id}/requests`),
    enabled: !!mine,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["market"] });
  const onError = (e: Error) => toast(e.message);

  const like = useMutation({
    mutationFn: (liked: boolean) => api<void>(`/market/items/${id}/likes`, { method: liked ? "DELETE" : "PUT" }),
    onSuccess: refresh,
    onError,
  });
  const ask = useMutation({
    mutationFn: () => api(`/market/items/${id}/requests`, { method: "POST", body: { message: message.trim() || null } }),
    onSuccess: () => {
      toast("거래를 요청했어요. 판매자가 수락하면 알려 드릴게요.");
      setAsking(false);
      setMessage("");
      refresh();
    },
    onError,
  });
  const status = useMutation({
    mutationFn: (s: MarketStatus) => api(`/market/items/${id}/status`, { method: "POST", body: { status: s } }),
    onSuccess: refresh,
    onError,
  });
  const accept = useMutation({
    mutationFn: (rid: number) => api<void>(`/market/requests/${rid}/accept`, { method: "POST" }),
    onSuccess: () => {
      toast("거래를 수락했어요.");
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api<void>(`/market/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      router.replace("/life");
    },
    onError,
  });

  if (item.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (item.isError || !item.data) return <p className="life-empty">{(item.error as Error)?.message ?? "물품을 찾을 수 없어요."}</p>;
  const d = item.data;

  return (
    <>
      <div className="life-gallery">
        {d.imageUrls.length ? (
          d.imageUrls.map((u) => <img key={u} src={assetUrl(u)} alt="" />)
        ) : (
          <Thumb category={d.category} size={430} />
        )}
      </div>
      <div className="life-card life-detail">
        <div className="life-seller">
          <span className="life-avatar">{d.seller.nickname.slice(0, 1)}</span>
          <div>
            <strong>{d.seller.nickname}</strong>
            <p className="life-sub">{d.seller.department ?? "재학생"}</p>
          </div>
          <span className="life-verified">
            <Icon name="shield" size={12} />
            재학생
          </span>
        </div>
        <span className={`life-pill ${d.status.toLowerCase()}`}>{STATUS_LABEL[d.status]}</span>
        <h2>{d.title}</h2>
        <p className="life-sub">
          {CATEGORY_LABEL[d.category]} · {timeAgo(d.createdAt)} · 조회 {d.viewCount}
        </p>
        <strong className="life-price">{won(d.price)}</strong>
        {d.tradePlace && (
          <p className="life-place">
            <Icon name="pin" size={14} /> {d.tradePlace}
          </p>
        )}
        <p className="life-desc">{d.description || "설명이 없어요."}</p>
      </div>

      {mine && (
        <div className="life-card">
          <h3 className="life-h3">판매 관리</h3>
          <div className="life-chips">
            {(["ON_SALE", "RESERVED", "SOLD"] as MarketStatus[]).map((s) => (
              <button key={s} className={`life-chip ${d.status === s ? "on" : ""}`} onClick={() => status.mutate(s)}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <h3 className="life-h3">받은 거래 요청</h3>
          {requests.data?.length ? (
            requests.data.map((r) => (
              <div key={r.id} className="life-req">
                <div>
                  <strong>{r.buyerNickname}</strong>
                  <p className="life-sub">{r.message || "메시지 없음"}</p>
                </div>
                {r.status === "PENDING" && d.status === "ON_SALE" ? (
                  <button className="life-btn small" onClick={() => accept.mutate(r.id)}>
                    수락
                  </button>
                ) : (
                  <span className="life-sub">{REQUEST_LABEL[r.status]}</span>
                )}
              </div>
            ))
          ) : (
            <p className="life-empty small">아직 받은 요청이 없어요.</p>
          )}
          <button className="life-btn ghost danger" onClick={() => confirm("이 물품을 삭제할까요?") && remove.mutate()}>
            물품 삭제
          </button>
        </div>
      )}

      {!mine && (
        <div className="life-bar">
          <button className={`life-heart ${d.liked ? "on" : ""}`} aria-label="관심" onClick={() => like.mutate(d.liked)}>
            <Icon name="heart" size={22} />
            <span>{d.likeCount}</span>
          </button>
          {asking ? (
            <form
              className="life-ask"
              onSubmit={(e) => {
                e.preventDefault();
                ask.mutate();
              }}
            >
              <input value={message} maxLength={200} onChange={(e) => setMessage(e.target.value)} placeholder="판매자에게 한마디 (선택)" autoFocus />
              <button className="life-btn small" disabled={ask.isPending}>
                보내기
              </button>
            </form>
          ) : (
            <button className="life-btn" disabled={d.status !== "ON_SALE"} onClick={() => setAsking(true)}>
              {d.status === "ON_SALE" ? "거래 요청하기" : STATUS_LABEL[d.status]}
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function ItemPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>물품 상세</h1>
      </div>
      <VerifyGate>
        <Detail id={id} />
      </VerifyGate>
    </>
  );
}
