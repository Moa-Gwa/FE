"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { goBack } from "@/lib/backNav";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import InlineError from "@/components/InlineError";
import VerifyGate from "@/components/market/VerifyGate";
import { chatMessagesKey, useChatConnected, useChatRooms, useMyId } from "@/hooks/useChat";
import { api } from "@/lib/api";
import { onChatError, sendChat } from "@/lib/chat";
import type { ChatMessagePage } from "@/types";

const time = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

function Room({ roomId }: { roomId: number }) {
  const qc = useQueryClient();
  const me = useMyId();
  const connected = useChatConnected();
  const room = useChatRooms().data?.find((r) => r.id === roomId);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const markedRead = useRef(0);

  const q = useInfiniteQuery({
    queryKey: chatMessagesKey(roomId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api<ChatMessagePage>(`/chats/${roomId}/messages${pageParam ? `?before=${pageParam}` : ""}`),
    getNextPageParam: (last) => (last.hasMore && last.messages.length ? last.messages[0].id : undefined),
    staleTime: Infinity, // 이후 변경은 useChatConnection이 실시간 반영
  });

  // 새 메시지·읽음은 useChatConnection이 캐시에 반영. 여기서는 전송 실패 알림만 처리
  const [sendError, setSendError] = useState<string | null>(null);
  useEffect(() => onChatError(setSendError), []);

  const pages = q.data?.pages ?? [];
  const messages = [...pages].reverse().flatMap((p) => p.messages);
  const newestId = messages.at(-1)?.id ?? 0;
  const partnerRead = pages[0]?.reads.find((r) => r.userId !== me)?.lastReadId ?? 0;

  // 화면을 보는 중일 때 마지막 메시지까지 읽음 처리
  useEffect(() => {
    let retry: ReturnType<typeof setTimeout> | undefined;
    const mark = () => {
      if (document.visibilityState !== "visible" || newestId <= markedRead.current) return;
      markedRead.current = newestId;
      api<void>(`/chats/${roomId}/read`, { method: "PUT", body: { lastReadId: newestId } })
        .then(() => qc.invalidateQueries({ queryKey: ["chats"] }))
        .catch(() => {
          markedRead.current = 0;
          retry = setTimeout(mark, 3000); // 일시적 실패 시 잠시 뒤 재시도
        });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => {
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", mark);
    };
  }, [newestId, roomId, qc]);

  // 맨 아래를 보던 경우에만 새 메시지로 스크롤(이전 메시지 읽는 중이면 유지)
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [newestId]);

  const send = () => {
    const content = text.trim();
    if (!content) return;
    if (!sendChat(roomId, content)) {
      setSendError("연결 중이에요. 잠시 후 다시 보내 주세요.");
      return;
    }
    setSendError(null);
    stickToBottom.current = true;
    setText("");
  };

  if (q.isLoading) return <p className="life-empty">불러오는 중…</p>;
  if (q.isError) return <p className="life-empty">{(q.error as Error).message}</p>;

  return (
    <>
      {room && (
        <div className="chat-rows single">
          <Link href={room.type === "GROUP" ? `/life/group/${room.groupBuyId}` : `/life/items/${room.itemId}`} className="chat-row">
            <div className="chat-row-body">
              <p className="chat-row-sub">{room.type === "GROUP" ? "같이 사기" : "중고거래"}</p>
              <strong>{room.title}</strong>
            </div>
            <span className="chat-row-go">
              <Icon name="chevron" size={18} />
            </span>
          </Link>
        </div>
      )}
      <div
        className="chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {q.hasNextPage && (
          <button className="chat-more" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage ? "불러오는 중…" : "이전 메시지 보기"}
          </button>
        )}
        {!messages.length && <p className="life-empty">첫 메시지를 보내 보세요.</p>}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const mine = m.senderId === me;
          const newDay = !prev || day.format(new Date(prev.createdAt)) !== day.format(new Date(m.createdAt));
          const showName = !mine && room?.type === "GROUP" && (newDay || prev?.senderId !== m.senderId);
          return (
            <div key={m.id}>
              {newDay && <p className="chat-day">{day.format(new Date(m.createdAt))}</p>}
              <div className={`chat-msg ${mine ? "mine" : ""}`}>
                {showName && <span className="chat-name">{m.senderName}</span>}
                <div className="chat-line">
                  <p className="chat-bubble">{m.content}</p>
                  <span className="chat-meta">
                    {mine && room?.type === "TRADE" && m.id > partnerRead && <em>1</em>}
                    {time.format(new Date(m.createdAt))}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="life-bar chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <InlineError error={sendError} />
        <textarea
          value={text}
          rows={1}
          maxLength={1000}
          placeholder={connected ? "메시지를 입력하세요" : "연결 중…"}
          aria-label="메시지 입력"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // 한글 조합 중 Enter는 글자 확정이라 전송 안 함. Shift+Enter는 줄바꿈
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="life-btn small" disabled={!connected || !text.trim()} aria-label="보내기">
          보내기
        </button>
      </form>
    </>
  );
}

export default function ChatRoomPage() {
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();
  const room = useChatRooms().data?.find((r) => r.id === Number(roomId));
  return (
    <>
      <div className="life-back-row">
        <button className="life-back" onClick={() => goBack(router, "/life/chats")} aria-label="뒤로">
          <Icon name="back" size={24} />
        </button>
        <h1>{room ? (room.type === "GROUP" ? room.title : room.partner) : "채팅"}</h1>
      </div>
      <VerifyGate>
        <Room roomId={Number(roomId)} />
      </VerifyGate>
    </>
  );
}
