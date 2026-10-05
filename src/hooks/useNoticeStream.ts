"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

/** Subscribes to server-sent notice changes and refreshes any cached notice data (no page reload needed). */
export function useNoticeStream(): boolean {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/api/stream`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false); // EventSource reconnects by itself
    source.addEventListener("notice", () => {
      for (const key of ["feed", "notice", "schedule", "bookmarks", "notifications", "admin"]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
    });
    return () => source.close();
  }, [qc]);

  return connected;
}
