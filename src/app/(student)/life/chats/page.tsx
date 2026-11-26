"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { goBack } from "@/lib/backNav";
import Badge from "@/components/Badge";
import Icon from "@/components/Icon";
import Thumb from "@/components/market/Thumb";
import VerifyGate from "@/components/market/VerifyGate";
import { useChatRooms } from "@/hooks/useChat";
import { timeAgo, unreadLabel } from "@/lib/market";

function Rooms() {
  const rooms = useChatRooms();
  if (rooms.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (rooms.isError) return <p className="life-empty">{(rooms.error as Error).message}</p>;
  if (!rooms.data?.length)
    return <p className="life-empty">아직 채팅이 없어요. 거래가 수락되거나 같이 사기에 참여하면 채팅방이 생겨요.</p>;
  return (
    <div className="chat-rows">
      {rooms.data.map((r) => (
        <Link key={r.id} href={`/life/chats/${r.id}`} className={`chat-row ${r.unread > 0 ? "has-unread" : ""}`}>
          <Thumb src={r.thumbnail} size={40} />
          <div className="chat-row-body">
            <strong>{r.type === "GROUP" ? r.title : r.partner}</strong>
            <p className="chat-row-sub">{r.lastMessage ?? "아직 메시지가 없어요"}</p>
          </div>
          <div className="chat-row-trail">
            <span>{timeAgo(r.lastAt)}</span>
            {r.unread > 0 && (
              <Badge color="blue" label={`안 읽은 메시지 ${r.unread}개`}>
                {unreadLabel(r.unread)}
              </Badge>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function ChatsPage() {
  const router = useRouter();
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => goBack(router, "/life")} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>채팅</h1>
      </div>
      <VerifyGate>
        <Rooms />
      </VerifyGate>
    </>
  );
}
