"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ScheduleColorPicker from "@/components/ScheduleColorPicker";
import ReminderToggle from "@/components/ReminderToggle";
import WheelDateTimePicker from "@/components/WheelDateTimePicker";
import InlineError from "@/components/InlineError";
import { useToast } from "@/components/Providers";
import { api } from "@/lib/api";
import type { ScheduleEntry } from "@/types";

const localTime = (at: string) => new Date(new Date(at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16);
const addHour = (value: string) => localTime(new Date(new Date(`${value}:00+09:00`).getTime() + 3600000).toISOString());

export default function PersonalScheduleForm({ entry, day, onClose, onSaved }: {
  entry: ScheduleEntry | null;
  day: string;
  onClose: () => void;
  onSaved: (day: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    // showModal은 첫 버튼(닫기)에 포커스를 줘 × 둘레에 포커스 테두리가 생기므로 창 자체에 포커스
    element?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const client = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [at, setAt] = useState(() => {
    if (!entry) return `${day}T09:00`;
    const existing = localTime(entry.at);
    const minute = Math.floor(Number(existing.slice(14, 16)) / 5) * 5;
    return `${existing.slice(0, 14)}${String(minute).padStart(2, "0")}`;
  });
  const [endAt, setEndAt] = useState(() => entry?.endAt ? localTime(entry.endAt) : addHour(at));
  const [boundary, setBoundary] = useState<"start" | "end">("start");
  const [location, setLocation] = useState(entry?.location ?? "");
  const [color, setColor] = useState<string | null>(entry?.color ?? null);
  const [memo, setMemo] = useState(entry?.memo ?? "");
  const [openedAt] = useState(() => Date.now());
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [invalid, setInvalid] = useState("");
  const save = useMutation({
    mutationFn: (remove: boolean) => api(entry ? `/me/schedules/${entry.noticeId}` : "/me/schedules", {
      method: remove ? "DELETE" : entry ? "PUT" : "POST",
      ...(remove ? {} : { body: { ...(!entry ? { reminderEnabled } : {}), title: title.trim(), color, endAt: new Date(`${endAt}:00+09:00`).toISOString(), at: new Date(`${at}:00+09:00`).toISOString(), location: location.trim() || null, memo: memo.trim() || null } }),
    }),
    onSuccess: async (_, remove) => {
      await client.invalidateQueries({ queryKey: ["schedule"] });
      await client.invalidateQueries({ queryKey: ["reminder"] });
      toast(remove ? "일정을 삭제했어요." : entry ? "일정을 수정했어요." : "일정을 추가했어요.");
      if (!remove) onSaved(at.slice(0, 10));
      onClose();
    },
  });

  return (
    <dialog ref={dialog} tabIndex={-1} className="modal personal-schedule-dialog personal-schedule-vertical" aria-labelledby="personal-schedule-title"
      onCancel={(e) => { e.preventDefault(); if (!save.isPending) onClose(); }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || save.isPending) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
      }}>
    <button type="button" className="link-btn personal-schedule-close" aria-label="일정 창 닫기" disabled={save.isPending} onClick={onClose}>×</button>
    <form className="personal-schedule-form correction-box" onSubmit={(e) => {
      e.preventDefault();
      if (!title.trim() || !at || !endAt) { setInvalid("제목과 날짜·시간을 입력해 주세요."); return; }
      if (endAt <= at) { setInvalid("종료 날짜·시간은 시작 날짜·시간 이후로 선택해 주세요."); return; }
      setInvalid("");
      save.mutate(false);
    }}>
      <div className="personal-schedule-heading"><h2 id="personal-schedule-title">{entry ? "내 일정 수정" : "내 일정 추가"}</h2><span>나에게만 보여요</span></div>
      <div className="form-group personal-field-date">
        <div className="personal-period-tabs" role="group" aria-label="일정 기간">
          <button type="button" aria-pressed={boundary === "start"} onClick={() => setBoundary("start")}><strong>시작</strong><span>{at.replace("T", " ")}</span></button>
          <button type="button" aria-pressed={boundary === "end"} onClick={() => setBoundary("end")}><strong>종료</strong><span>{endAt.replace("T", " ")}</span></button>
        </div>
        <span className="wheel-field-label">{boundary === "start" ? "시작 날짜·시간 (한국 시간)" : "종료 날짜·시간 (한국 시간)"}</span>
        <WheelDateTimePicker key={boundary} value={boundary === "start" ? at : endAt} onChange={value => {
          if (boundary === "end") setEndAt(value);
          else { setAt(value); if (endAt <= value) setEndAt(addHour(value)); }
        }} disabled={save.isPending} />
      </div>
      <div className="form-group personal-field-title">
        <label htmlFor="personal-title">제목</label>
        <input id="personal-title" value={title} maxLength={100} required placeholder="예: 팀 프로젝트 회의" onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-group personal-field-color">
        <span className="personal-color-label">일정 색상</span>
        <ScheduleColorPicker value={color} onChange={setColor} disabled={save.isPending} />
      </div>
      <div className="form-group personal-field-location">
        <label htmlFor="personal-location">장소 (선택)</label>
        <input id="personal-location" value={location} maxLength={200} placeholder="예: 중앙도서관 스터디룸" onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="form-group personal-field-memo">
        <label htmlFor="personal-memo">메모 (선택)</label>
        <textarea id="personal-memo" rows={2} value={memo} maxLength={1000} placeholder="기억할 내용을 남겨 보세요" onChange={(e) => setMemo(e.target.value)} />
      </div>
      {entry ? <ReminderToggle source="PERSONAL" id={entry.noticeId} /> : <div className="form-group reminder-settings reminder-create">
        <label><input type="checkbox" checked={reminderEnabled} onChange={e => setReminderEnabled(e.target.checked)} /> 시작 24시간 전 리마인더</label>
        <p className="hint">{new Date(`${at}:00+09:00`).getTime() - openedAt <= 86400000 ? "24시간 전 알림 시점이 지났어요. 현재 날짜로는 알림을 보내지 않아요." : "앱 안 알림으로 알려드려요. 기기 푸시는 MY에서 켜 주세요."}</p>
      </div>}
      <InlineError error={invalid || save.error} />
      <div className="btn-row">
        <button className="primary" type="submit" disabled={save.isPending}>{save.isPending ? "처리 중…" : entry ? "수정하기" : "추가하기"}</button>
        <button className="secondary" type="button" disabled={save.isPending} onClick={onClose}>취소</button>
        {entry && <button className="link-btn personal-delete" type="button" disabled={save.isPending} onClick={() => save.mutate(true)}>삭제하기</button>}
      </div>

    </form>
    </dialog>
  );
}
