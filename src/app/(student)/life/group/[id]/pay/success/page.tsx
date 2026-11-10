"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Providers";
import PayResult from "@/components/market/PayResult";
import VerifyGate from "@/components/market/VerifyGate";
import { CHAT_ROOMS_KEY } from "@/hooks/useChat";
import { api } from "@/lib/api";
import type { GroupBuyDetail } from "@/types";

/** 결제위젯 성공 주소. 서버 승인이 끝나야 참여 확정 */
function Confirm({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const body = { paymentKey: params.get("paymentKey"), orderId: params.get("orderId"), amount: Number(params.get("amount")) };
    api<GroupBuyDetail>("/market/group-buys/payments/confirm", { method: "POST", body })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["market"] });
        qc.invalidateQueries({ queryKey: CHAT_ROOMS_KEY });
        toast("결제하고 참여했어요.");
        router.replace(`/life/group/${id}`);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, params, qc, router, toast]);

  return error ? (
    <PayResult
      tone="error"
      title="결제를 확인하지 못했어요"
      description={`${error} 결제가 승인되지 않았다면 금액은 청구되지 않아요.`}
      backHref={`/life/group/${id}`}
    />
  ) : (
    <PayResult tone="loading" title="결제를 확인하고 있어요" description="잠시만 기다려 주세요. 확인이 끝나면 모집 화면으로 이동해요." />
  );
}

export default function PaySuccessPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <VerifyGate>
      <Suspense>
        <Confirm id={id} />
      </Suspense>
    </VerifyGate>
  );
}
