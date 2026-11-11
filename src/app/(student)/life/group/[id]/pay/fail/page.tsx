"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PayResult from "@/components/market/PayResult";

/** 결제위젯 실패 주소. 결제가 승인되지 않아 참여하지 않은 상태 */
function Fail({ id }: { id: string }) {
  const params = useSearchParams();
  const canceled = params.get("code") === "PAY_PROCESS_CANCELED";
  return canceled ? (
    <PayResult tone="neutral" title="결제를 취소했어요" description="참여 신청은 완료되지 않았어요. 언제든 다시 참여할 수 있어요." backHref={`/life/group/${id}`} />
  ) : (
    <PayResult
      tone="error"
      title="결제를 완료하지 못했어요"
      description={params.get("message") ?? "잠시 후 다시 시도해 주세요."}
      backHref={`/life/group/${id}`}
    />
  );
}

export default function PayFailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Suspense>
      <Fail id={id} />
    </Suspense>
  );
}
