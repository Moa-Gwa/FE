"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ScheduleColorPicker from "@/components/ScheduleColorPicker";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { ScheduleEntry } from "@/types";

export default function ScheduleColorDialog({ entry, onClose, onOpen }: {
  entry: ScheduleEntry; onClose: () => void; onOpen: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const client = useQueryClient();
  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, []);
  const save = useMutation({
    mutationFn: (color: string | null) => api(`/me/schedule-colors/${entry.source}/${entry.noticeId}`, { method: "PUT", body: { type: entry.type, color } }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["schedule"] }); onClose(); },
  });
  return <dialog ref={dialog} className="modal schedule-color-dialog" aria-labelledby="schedule-color-title"
    onCancel={e => { e.preventDefault(); if (!save.isPending) onClose(); }}>
    <button type="button" className="link-btn schedule-color-close" aria-label="색상 창 닫기" disabled={save.isPending} onClick={onClose}>×</button>
    <h2 id="schedule-color-title">{entry.title}</h2>
    <p className="hint">{fmtDate(entry.at)} · {entry.organizationName}</p>
    <h3>일정 색상</h3>
    <p className="hint">내 캘린더에만 적용돼요.</p>
    <ScheduleColorPicker value={entry.color ?? null} onChange={color => save.mutate(color)} disabled={save.isPending} />
    <InlineError error={save.error} />
    <button type="button" className="primary" disabled={save.isPending} onClick={onOpen}>{entry.source === "PERSONAL" ? "일정 수정" : entry.source === "ACADEMIC" ? "학사일정 원문 보기" : "공지 보기"}</button>
  </dialog>;
}
