import { api, apiResponse } from "@/lib/api";
import { parseSse } from "@/lib/sse";

export type ChatbotSource = {
  n: number;
  kind: string;
  title: string;
  url?: string | null;
  department?: string | null;
  phone?: string | null;
};

export type ChatbotEvent =
  | { event: "token"; data: { text: string } }
  | { event: "understood"; data: { interpretation: string } }
  | { event: "clarify"; data: { thread_id: string; interpretation: string; alternatives: string[] } }
  | { event: "retry"; data: { message: string } }
  | { event: "sources"; data: ChatbotSource[] }
  | { event: "done"; data: { grounded: boolean; cited?: number[] } }
  | { event: "error"; data: { code: string; message: string } };

export type ChatbotTurn = { role: "user" | "assistant"; content: string };

export type ResumeChoice = { choice: "confirm" | "alternative" | "retry"; index?: number };

async function stream(path: string, body: unknown, onEvent: (e: ChatbotEvent) => void, signal: AbortSignal) {
  // Accept: text/event-stream을 붙이면 BE 오류 응답(JSON)이 협상에 실패해 빈 500이 되므로 붙이지 않음
  const res = await apiResponse(path, { method: "POST", body, signal });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseSse<ChatbotEvent>(buffer + value);
    buffer = parsed.rest;
    parsed.events.forEach(onEvent);
  }
  parseSse<ChatbotEvent>(buffer + "\n\n").events.forEach(onEvent);
}

export function askChatbot(question: string, history: ChatbotTurn[], onEvent: (e: ChatbotEvent) => void, signal: AbortSignal) {
  return stream("/me/chatbot", { question, history }, onEvent, signal);
}

export function resumeChatbot(threadId: string, choice: ResumeChoice, onEvent: (e: ChatbotEvent) => void, signal: AbortSignal) {
  return stream(`/me/chatbot/${encodeURIComponent(threadId)}/resume`, choice, onEvent, signal);
}

export function sendChatbotFeedback(body: { rating: "helpful" | "not_helpful"; sourceUrls: string[] }) {
  return api<void>("/me/chatbot/feedback", { method: "POST", body });
}
