import { type InfiniteData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import { connectChat, disconnectChat, isChatConnected, onChatEvent, onChatStatus } from "@/lib/chat";
import { useSession } from "@/lib/session";
import type { ChatEvent, ChatMessagePage, ChatRoom, Profile } from "@/types";

export const CHAT_ROOMS_KEY = ["chats"];
export const chatMessagesKey = (roomId: number) => ["chat", roomId];

export type ChatPages = InfiniteData<ChatMessagePage, number | undefined>;

/** 실시간 메시지·읽음을 최신 페이지(pages[0])에 반영 */
function applyEvent(data: ChatPages | undefined, e: ChatEvent): ChatPages | undefined {
  if (!data?.pages.length) return data;
  const [first, ...rest] = data.pages;
  if (e.type === "room") return data;
  if (e.type === "message") {
    if (first.messages.some((m) => m.id === e.message.id)) return data;
    return { ...data, pages: [{ ...first, messages: [...first.messages, e.message] }, ...rest] };
  }
  const reads = [...first.reads.filter((r) => r.userId !== e.read.userId), e.read];
  return { ...data, pages: [{ ...first, reads }, ...rest] };
}

/**
 * 재학생 인증 학생이면 연결. account가 바뀌면(로그아웃, 다른 탭에서 다른 계정 로그인) 연결과 채팅 캐시 초기화.
 * 받은 이벤트는 보고 있지 않은 방의 캐시에도 반영
 */
export function useChatConnection(account: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!account) return;
    connectChat();
    const offEvent = onChatEvent((e) => {
      const key = chatMessagesKey(e.roomId);
      // 첫 로딩 중이라 캐시가 없으면 다시 불러와 메시지 누락 방지
      if (qc.getQueryData(key)) qc.setQueryData<ChatPages>(key, (d) => applyEvent(d, e));
      else qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: CHAT_ROOMS_KEY });
    });
    // 첫 연결 포함 매 연결마다 재조회. 구독 전 도착한 메시지 누락 방지
    const offStatus = onChatStatus((connected) => {
      if (!connected) return;
      qc.invalidateQueries({ queryKey: ["chat"] });
      qc.invalidateQueries({ queryKey: CHAT_ROOMS_KEY });
    });
    return () => {
      offEvent();
      offStatus();
      disconnectChat();
      // 다른 계정으로 로그인했을 때 이전 사용자의 대화가 보이지 않도록 삭제
      qc.removeQueries({ queryKey: ["chat"] });
      qc.removeQueries({ queryKey: CHAT_ROOMS_KEY });
      qc.removeQueries({ queryKey: ["me", "profile"] });
    };
  }, [account, qc]);
}

export function useChatConnected() {
  return useSyncExternalStore(onChatStatus, isChatConnected, () => false);
}

export function useChatRooms() {
  const session = useSession();
  return useQuery({
    queryKey: CHAT_ROOMS_KEY,
    queryFn: () => api<ChatRoom[]>("/me/chats"),
    enabled: !!session?.verified,
  });
}

/** 내 메시지 구분용 id. 세션에 사용자 id가 없어 프로필에서 조회 */
export function useMyId() {
  return useQuery({ queryKey: ["me", "profile"], queryFn: () => api<Profile>("/me/profile") }).data?.id;
}
