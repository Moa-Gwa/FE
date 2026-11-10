"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import VerifyGate from "@/components/market/VerifyGate";
import { api } from "@/lib/api";
import { won } from "@/lib/market";
import { createWidgets, TOSS_CLIENT_KEY, TOSS_TEST_MODE, type TossWidgets } from "@/lib/toss";
import type { PaymentOrder } from "@/types";

function Pay({ id }: { id: string }) {
  const quantity = Number(useSearchParams().get("quantity") ?? "1");
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState(TOSS_CLIENT_KEY ? "" : "결제 설정이 없어 결제할 수 없어요.");
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const widgets = useRef<TossWidgets | null>(null);
  const started = useRef(false);

  // 주문 생성 → 결제위젯 렌더링. 개발 모드의 Effect 재실행에도 주문은 한 번만 생성
  useEffect(() => {
    if (!TOSS_CLIENT_KEY || started.current) return;
    started.current = true;
    (async () => {
      const created = await api<PaymentOrder>(`/market/group-buys/${id}/payments`, { method: "POST", body: { quantity } });
      setOrder(created);
      const w = await createWidgets();
      await w.setAmount({ currency: "KRW", value: created.amount });
      await Promise.all([
        w.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
        w.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      widgets.current = w;
      setReady(true);
    })().catch((e: Error) => setError(e.message));
  }, [id, quantity]);

  const pay = async () => {
    if (!widgets.current || !order) return;
    setPaying(true);
    const base = `${window.location.origin}/life/group/${id}/pay`;
    try {
      await widgets.current.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${base}/success`,
        failUrl: `${base}/fail`,
      });
    } catch (e) {
      setError((e as Error).message);
      setPaying(false);
    }
  };

  if (error)
    return (
      <div className="life-card">
        <p className="life-empty small">{error}</p>
        <Link href={`/life/group/${id}`} className="life-btn ghost">
          모집으로 돌아가기
        </Link>
      </div>
    );

  return (
    <>
      {order && (
        <div className="life-card">
          <p className="life-sub">결제할 금액</p>
          <strong className="life-price">{won(order.amount)}</strong>
          <p className="life-sub">{order.orderName}</p>
        </div>
      )}
      {TOSS_TEST_MODE && (
        <p className="pay-test-note">
          테스트 결제 환경이에요. 결제해도 실제 금액은 빠져나가지 않아요. PAYCO는 테스트 결제를 지원하지 않으니 다른 결제 수단을 선택해 주세요.
        </p>
      )}
      <div className="pay-widget">
        <div id="payment-method" />
        <div id="agreement" />
      </div>
      {!ready && <p className="life-empty small">결제 수단을 불러오는 중…</p>}
      <div className="life-bar">
        <button className="life-btn" disabled={!ready || paying} onClick={pay}>
          {order ? `${won(order.amount)} 결제하기` : "결제하기"}
        </button>
      </div>
    </>
  );
}

export default function PayPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => router.back()} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>결제하기</h1>
      </div>
      <VerifyGate>
        <Suspense>
          <Pay id={id} />
        </Suspense>
      </VerifyGate>
    </>
  );
}
