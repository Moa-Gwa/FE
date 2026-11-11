"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { onSessionChange } from "@/lib/session";

const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } } });
    // 세션이 바뀌면 이전 계정으로 받은 조회 결과가 그려지기 전에 비우고 다시 불러옴
    if (typeof window !== "undefined") onSessionChange(() => qc.resetQueries());
    return qc;
  });
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((m: string) => {
    setMessage(m);
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 2200);
  }, []);

  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={toast}>
        {children}
        <div id="toast" className={shown ? "show" : ""} aria-live="polite">
          {message}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
