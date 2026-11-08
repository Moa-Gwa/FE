import { Client } from "@stomp/stompjs";
import { API_BASE } from "@/lib/api";
import type { ChatEvent } from "@/types";

/**
 * 로그인한 재학생당 STOMP 연결 하나. 인증은 /ws 핸드셰이크의 세션 쿠키로 처리.
 * 새 메시지·읽음은 /user/queue/chat, 전송 실패는 /user/queue/errors 로 수신
 */
type Listener = (event: ChatEvent) => void;
type ErrorListener = (message: string) => void;

const listeners = new Set<Listener>();
const errorListeners = new Set<ErrorListener>();
const statusListeners = new Set<(connected: boolean) => void>();
let client: Client | null = null;

function setConnected(value: boolean) {
  statusListeners.forEach((l) => l(value));
}

export function connectChat() {
  if (client) return;
  client = new Client({
    brokerURL: `${(API_BASE || window.location.origin).replace(/^http/, "ws")}/ws`,
    reconnectDelay: 3000,
    onConnect: () => {
      client?.subscribe("/user/queue/chat", (frame) => {
        const event = JSON.parse(frame.body) as ChatEvent;
        listeners.forEach((l) => l(event));
      });
      client?.subscribe("/user/queue/errors", (frame) => {
        const { message } = JSON.parse(frame.body) as { message: string };
        errorListeners.forEach((l) => l(message));
      });
      setConnected(true);
    },
    onWebSocketClose: () => setConnected(false),
  });
  client.activate();
}

export function disconnectChat() {
  void client?.deactivate();
  client = null;
  setConnected(false);
}

export function isChatConnected() {
  return !!client?.connected;
}

/** 연결이 끊긴 상태면 false 반환. 화면은 입력 내용을 유지해 재시도 가능 */
export function sendChat(roomId: number, content: string): boolean {
  if (!client?.connected) return false;
  client.publish({ destination: "/app/chat.send", body: JSON.stringify({ roomId, content }) });
  return true;
}

export function onChatEvent(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function onChatError(listener: ErrorListener) {
  errorListeners.add(listener);
  return () => void errorListeners.delete(listener);
}

export function onChatStatus(listener: (connected: boolean) => void) {
  statusListeners.add(listener);
  return () => void statusListeners.delete(listener);
}
