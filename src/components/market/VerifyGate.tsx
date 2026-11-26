"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import type { IconName } from "@/components/Icon";
import { useSession } from "@/lib/session";

const FEATURES: [IconName, string, string][] = [
  ["tag", "중고거래", "안 쓰는 물건을 학교 안에서 사고팔아요."],
  ["users", "같이 사기", "여럿이 모여 함께 사요."],
  ["chat", "채팅", "거래가 수락되거나 같이 사기에 참여하면 채팅으로 약속을 잡아요."],
];

/** 재학생 인증을 마친 학생에게만 children을 보여 준다. 아니면 인증 안내를 보여 준다. */
export default function VerifyGate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (!session) return null;
  if (session.verified) return <>{children}</>;
  return (
    <>
      <img className="life-gate-art" src="/mascot-trade.webp" alt="" />
      <div className="life-card life-gate">
        <h2>
          <Icon name="shield" /> 재학생 인증이 필요해요
        </h2>
        <p>
          생활거래는 가톨릭대 재학생끼리만 이용할 수 있어요.
          <br />
          학교 메일로 한 번만 인증하면 바로 쓸 수 있어요.
        </p>
        <ul className="life-gate-features">
          {FEATURES.map(([icon, title, desc]) => (
            <li key={title}>
              <span aria-hidden="true"><Icon name={icon} size={20} /></span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/life/verify" className="life-btn">
          학교 메일로 인증하기
        </Link>
        <p className="life-note">공지, 북마크, 알림은 인증 없이 지금처럼 쓸 수 있어요.</p>
      </div>
    </>
  );
}
