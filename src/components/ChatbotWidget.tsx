"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import InlineError from "@/components/InlineError";
import { ApiError } from "@/lib/api";
import {
  askChatbot,
  resumeChatbot,
  sendChatbotFeedback,
  type ChatbotEvent,
  type ChatbotSource,
  type ChatbotTurn,
  type ResumeChoice,
} from "@/lib/chatbot";

const SUGGESTIONS = [
  "휴학 신청은 어떻게 해요?",
  "증명서는 어디서 발급해요?",
  "장학금 문의는 어디로 해요?",
  "학교 와이파이 연결 방법",
];
const MAX_QUESTION = 500;

type Clarify = {
  threadId: string;
  interpretation: string;
  alternatives: string[];
};
type Bot = {
  id: number;
  role: "bot";
  text: string;
  interpretation?: string;
  sources?: ChatbotSource[];
  clarify?: Clarify;
  notice?: string;
  error?: unknown;
  done: boolean;
  rating?: "helpful" | "not_helpful";
  feedbackError?: unknown;
};
type Message = { id: number; role: "user"; text: string } | Bot;

let nextId = 1;

/** 답변의 [n] 근거 번호를 출처 카드로 가는 링크로 바꿈. 번호만 다음 줄로 넘어가지 않게 앞 공백과 굵게 표시(**)는 지움 */
function AnswerText({ id, text, sources }: { id: number; text: string; sources?: ChatbotSource[] }) {
  return (
    <p className="chatbot-text">
      {text
        .replace(/\*\*/g, "")
        .replace(/\s+(\[\d+\])/g, "$1")
        .split(/(\[\d+\])/)
        .map((part, i) => {
          const n = /^\[(\d+)\]$/.exec(part)?.[1];
          if (!n || !sources?.some((s) => s.n === Number(n))) return part;
          return (
            <a key={i} className="chatbot-cite" href={`#chatbot-src-${id}-${n}`} aria-label={`출처 ${n}`}>
              {n}
            </a>
          );
        })}
    </p>
  );
}

function SourceCard({ id, source }: { id: number; source: ChatbotSource }) {
  return (
    <li id={`chatbot-src-${id}-${source.n}`} className="chatbot-source">
      <span className="chatbot-source-n">{source.n}</span>
      <div>
        {source.url ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.title}
          </a>
        ) : (
          <strong>{source.title}</strong>
        )}
        <span className="chatbot-source-meta">
          {source.kind === "regulation" ? "학교 규정" : source.kind === "notice" ? "공지" : "학교 안내"}
          {source.department && `, ${source.department}`}
          {source.phone && (
            <>
              {", "}
              <a href={`tel:${source.phone.replace(/[^\d+]/g, "")}`}>{source.phone}</a>
            </>
          )}
        </span>
      </div>
    </li>
  );
}

/** 학교 안내 챗봇. 학생 화면 오른쪽 아래 버튼으로 열고, 모바일에서는 전체 화면으로 덮음 */
export default function ChatbotWidget({ showButton }: { showButton: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // 뒤로 가기로 창을 닫을 수 있게 열 때 기록을 하나 쌓음
  useEffect(() => {
    if (!open) return;
    history.pushState({ chatbot: true }, "");
    const onPop = () => setOpen(false);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [open]);

  // 모바일 키보드가 올라오면 보이는 영역에 맞춰 창 높이를 줄여 입력창이 가려지지 않게 함
  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const fit = () => {
      sheetRef.current?.style.setProperty("--chatbot-vh", `${vv.height}px`);
      sheetRef.current?.style.setProperty("--chatbot-top", `${vv.offsetTop}px`);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const close = () => {
    if (history.state?.chatbot) history.back();
    else setOpen(false);
  };

  const patch = (id: number, change: (m: Bot) => Partial<Bot>) =>
    setMessages((ms) => ms.map((m) => (m.id === id && m.role === "bot" ? { ...m, ...change(m) } : m)));

  const onEvent = (id: number) => (e: ChatbotEvent) => {
    switch (e.event) {
      case "token":
        return patch(id, (m) => ({ text: m.text + e.data.text }));
      case "understood":
        return patch(id, () => ({ interpretation: e.data.interpretation }));
      case "clarify":
        return patch(id, () => ({
          clarify: {
            threadId: e.data.thread_id,
            interpretation: e.data.interpretation,
            alternatives: e.data.alternatives,
          },
        }));
      case "retry":
        setHint(e.data.message);
        inputRef.current?.focus();
        return patch(id, () => ({ notice: e.data.message }));
      case "sources":
        return patch(id, () => ({ sources: e.data }));
      case "error":
        return patch(id, () => ({ error: e.data.message }));
      case "done": {
        // 검색된 자료 전부가 아니라 답변이 실제로 근거로 단 출처만 카드로 보여 줌
        const cited = e.data.cited;
        return patch(id, (m) => (cited ? { sources: m.sources?.filter((src) => cited.includes(src.n)) } : {}));
      }
    }
  };

  const run = async (id: number, call: (signal: AbortSignal) => Promise<void>) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      await call(controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) patch(id, () => ({ error: err }));
    } finally {
      patch(id, () => ({ done: true }));
      setBusy(false);
    }
  };

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    // 질문, 답변이 모두 끝난 대화만 최근 6개까지 넘김
    const history: ChatbotTurn[] = messages
      .filter((m) => m.text && (m.role === "user" || (m.done && !m.error && !m.clarify)))
      .map((m): ChatbotTurn => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text.slice(0, 2000),
      }))
      .slice(-6);
    const botId = nextId + 1;
    nextId += 2;
    setMessages((ms) => [...ms, { id: botId - 1, role: "user", text: q }, { id: botId, role: "bot", text: "", done: false }]);
    setInput("");
    setHint(null);
    void run(botId, (signal) => askChatbot(q, history, onEvent(botId), signal));
  };

  const choose = (bot: Bot, choice: ResumeChoice) => {
    const clarify = bot.clarify!;
    if (choice.choice !== "retry") {
      patch(bot.id, () => ({
        clarify: undefined,
        interpretation: choice.choice === "confirm" ? clarify.interpretation : clarify.alternatives[choice.index!],
        done: false,
      }));
    } else {
      patch(bot.id, () => ({ clarify: undefined, done: false }));
    }
    void run(bot.id, (signal) => resumeChatbot(clarify.threadId, choice, onEvent(bot.id), signal));
  };

  const askAgain = () => {
    setHint("어떤 걸 알고 싶은지 조금 더 자세히 알려 주세요.");
    inputRef.current?.focus();
  };

  const rate = async (bot: Bot, rating: "helpful" | "not_helpful") => {
    patch(bot.id, () => ({ rating, feedbackError: null }));
    try {
      await sendChatbotFeedback({
        rating,
        sourceUrls: (bot.sources ?? []).flatMap((s) => (s.url ? [s.url] : [])),
      });
    } catch (err) {
      patch(bot.id, () => ({ rating: undefined, feedbackError: err }));
    }
  };

  const lastUserText = (bot: Bot) => {
    const i = messages.findIndex((m) => m.id === bot.id);
    return messages.slice(0, i).findLast((m) => m.role === "user")?.text ?? "";
  };

  if (!open) {
    return (
      showButton && (
        <div className="life-fab-wrap">
        <button type="button" className="chatbot-fab" aria-label="학교 안내 챗봇" onClick={() => setOpen(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/moa-gwa-logo.png" alt="" />
          <span className="chatbot-fab-label" aria-hidden="true">Ask me!</span>
        </button>
      </div>
      )
    );
  }

  return (
    <div className="chatbot-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="chatbot-title">
      <header className="chatbot-head">
        <h2 id="chatbot-title">모아과 도우미</h2>
        <button type="button" className="chatbot-icon-btn" aria-label="챗봇 닫기" onClick={close}>
          <Icon name="close" />
        </button>
      </header>

      <div className="chatbot-list" ref={listRef} aria-live="polite">
        <div className="chatbot-bubble bot">
          <p className="chatbot-text">
            휴학, 증명서, 장학금처럼 학교 일을 물어보면 학교 홈페이지와 규정에서 찾아 문의처와 절차를 알려 드려요.
          </p>
        </div>
        {messages.length === 0 && (
          <div className="chatbot-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chatbot-chip" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="chatbot-bubble user">
              <p className="chatbot-text">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="chatbot-bubble bot">
              {m.interpretation && !m.clarify && (
                <div className="chatbot-understood">
                  <span>이렇게 이해했어요: {m.interpretation}</span>
                  {m.done && !m.notice && (
                    <button type="button" className="chatbot-link" onClick={askAgain}>
                      다시 물어볼게요
                    </button>
                  )}
                </div>
              )}

              {m.clarify && (
                <>
                  <p className="chatbot-text">이렇게 이해했어요: {m.clarify.interpretation}</p>
                  {/* 새 질문을 하면 지난 확인 칩은 숨김(답이 위쪽에 생기거나 확인 시간이 지나 실패함) */}
                  {m.id === messages.at(-1)?.id && (
                    <div className="chatbot-chips">
                      <button
                        type="button"
                        className="chatbot-chip primary"
                        disabled={busy}
                        onClick={() => choose(m, { choice: "confirm" })}
                      >
                        맞아요
                      </button>
                      {m.clarify.alternatives.map((alt, index) => (
                        <button
                          key={alt}
                          type="button"
                          className="chatbot-chip"
                          disabled={busy}
                          onClick={() => choose(m, { choice: "alternative", index })}
                        >
                          {alt}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="chatbot-chip"
                        disabled={busy}
                        onClick={() => choose(m, { choice: "retry" })}
                      >
                        아니에요, 다시 물어볼게요
                      </button>
                    </div>
                  )}
                </>
              )}

              {m.text && <AnswerText id={m.id} text={m.text} sources={m.sources} />}
              {m.notice && <p className="chatbot-text">{m.notice}</p>}
              {!m.done && !m.text && !m.clarify && <p className="chatbot-typing">답변을 찾고 있어요…</p>}

              {m.done && !m.error && m.text && m.sources && m.sources.length > 0 && (
                <ol className="chatbot-sources" aria-label="출처">
                  {m.sources.map((s) => (
                    <SourceCard key={s.n} id={m.id} source={s} />
                  ))}
                </ol>
              )}

              {m.error ? (
                <div className="chatbot-error">
                  <InlineError error={m.error} />
                  {!(m.error instanceof ApiError && m.error.status === 429) && (
                    <button type="button" className="chatbot-link" disabled={busy} onClick={() => ask(lastUserText(m))}>
                      다시 시도
                    </button>
                  )}
                </div>
              ) : (
                m.done &&
                m.text && (
                  <div className="chatbot-feedback">
                    <button
                      type="button"
                      className="chatbot-icon-btn"
                      aria-label="도움 됐어요"
                      aria-pressed={m.rating === "helpful"}
                      disabled={!!m.rating}
                      onClick={() => rate(m, "helpful")}
                    >
                      <Icon name="smile" />
                    </button>
                    <button
                      type="button"
                      className="chatbot-icon-btn"
                      aria-label="아쉬워요"
                      aria-pressed={m.rating === "not_helpful"}
                      disabled={!!m.rating}
                      onClick={() => rate(m, "not_helpful")}
                    >
                      <Icon name="frown" />
                    </button>
                    {m.rating && <span className="chatbot-thanks">의견 고마워요</span>}
                    <InlineError error={m.feedbackError} />
                  </div>
                )
              )}
            </div>
          ),
        )}
      </div>

      <form
        className="chatbot-compose"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        {hint && <p className="chatbot-hint">{hint}</p>}
        <div className="chatbot-compose-row">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={MAX_QUESTION}
            placeholder="학교 일을 물어보세요"
            aria-label="질문"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask(input);
              }
            }}
          />
          <button type="submit" className="chatbot-send" aria-label="보내기" disabled={busy || !input.trim()}>
            <Icon name="send" />
          </button>
        </div>
      </form>
    </div>
  );
}
