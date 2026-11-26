"use client";

import { useRouter } from "next/navigation";
import { goBack } from "@/lib/backNav";
import Icon from "@/components/Icon";
import ItemForm from "@/components/market/ItemForm";
import VerifyGate from "@/components/market/VerifyGate";

export default function NewItemPage() {
  const router = useRouter();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => goBack(router, "/life")} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>물품 등록</h1>
      </div>
      <VerifyGate>
        <ItemForm />
      </VerifyGate>
    </>
  );
}
