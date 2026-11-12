"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { useSession } from "@/lib/session";

/** 재학생 인증을 마친 학생에게만 children을 보여 준다. 아니면 인증 안내를 보여 준다. */
export default function VerifyGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (!session) return null;
  if (session.verified) return <>{children}</>;
  return (
    <div className="life-card life-gate">
      <span className="life-gate-badge">
        <Icon name="shield" size={26} />
      </span>
      <h2>재학생 인증이 필요해요</h2>
      <p>생활거래는 가톨릭대 재학생끼리만 이용할 수 있어요. 학교 메일로 한 번만 인증하면 바로 쓸 수 있어요.</p>
      <Link href="/life/verify" className="life-btn">
        학교 메일로 인증하기
      </Link>
      <p className="life-note">공지, 북마크, 알림은 인증 없이 지금처럼 쓸 수 있어요.</p>
    </div>
  );
}
