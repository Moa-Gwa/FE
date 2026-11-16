"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Providers";
import { countImages, MAX_IMAGES, newKey, type EditorBlock } from "@/components/BlocksEditor";
import { api } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import type { AdminNotice, Block, NoticeInput } from "@/types";

/** Existing notices open as blocks; legacy plain notices become "images, then text". */
function initialBlocks(n: AdminNotice | null): EditorBlock[] {
  if (!n) return [{ type: "TEXT", text: "", key: newKey() }];
  let blocks: Block[] = n.blocks ?? [];
  if (blocks.length === 0) {
    blocks = [
      ...(n.imageUrls.length ? [{ type: "IMAGES", images: n.imageUrls, layout: "CAROUSEL" } as Block] : []),
      { type: "TEXT", text: n.description },
    ];
  }
  return blocks.map((b) => ({ ...b, key: newKey() }));
}

/** What gets saved/previewed: empty text and empty image groups dropped. */
const cleanBlocks = (blocks: EditorBlock[]): Block[] =>
  blocks
    .map((b): Block =>
      b.type === "TEXT"
        ? { type: "TEXT", text: b.text }
        : { type: "IMAGES", images: b.images, layout: b.layout, captions: b.images.map((_, i) => b.captions?.[i] ?? "") },
    )
    .filter((b) => (b.type === "TEXT" ? b.text.trim() !== "" : b.images.length > 0));

/** 공지 작성 폼의 상태·검증·저장. 화면 컴포넌트는 이 값만 받아 그림 */
export function useNoticeForm(initial: AdminNotice | null) {
  const router = useRouter();
  const toast = useToast();

  const [categoryIds, setCategoryIds] = useState<number[]>(initial?.categoryIds ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => initialBlocks(initial));
  const [eventStart, setEventStart] = useState(toLocalInput(initial?.eventStartAt ?? null));
  const [eventEnd, setEventEnd] = useState(toLocalInput(initial?.eventEndAt ?? null));
  const [deadline, setDeadline] = useState(toLocalInput(initial?.deadlineAt ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [link, setLink] = useState(initial?.externalLink ?? "");
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [mode, setMode] = useState<"NOW" | "SCHEDULED">(initial?.status === "SCHEDULED" ? "SCHEDULED" : "NOW");
  const [publishAt, setPublishAt] = useState(toLocalInput(initial?.status === "SCHEDULED" ? initial.publishAt : null));
  const [step, setStep] = useState<"write" | "publish">("write");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const published = initial?.status === "PUBLISHED" || initial?.status === "CLOSED";
  const clean = useMemo(() => cleanBlocks(blocks), [blocks]);

  // "dirty" = anything typed since the page opened; used to confirm before leaving
  const [snapshot] = useState(() => JSON.stringify([initial?.title ?? "", cleanBlocks(initialBlocks(initial))]));
  const dirty = JSON.stringify([title, clean]) !== snapshot;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function writeProblems(): string | null {
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!clean.some((b) => b.type === "TEXT")) return "본문 글을 입력해 주세요.";
    if (countImages(clean) > MAX_IMAGES) return `이미지는 최대 ${MAX_IMAGES}장까지 넣을 수 있어요.`;
    return null;
  }

  function problems(forPublish: boolean): string | null {
    const w = writeProblems();
    if (w) return w;
    if (categoryIds.length === 0) return "카테고리를 1개 이상 선택해 주세요.";
    if (eventStart && eventEnd && new Date(eventEnd) <= new Date(eventStart)) return "행사 종료 시각은 시작 이후여야 해요.";
    if (forPublish && !published && mode === "SCHEDULED" && (!publishAt || new Date(publishAt) <= new Date()))
      return "예약 게시 시각은 현재 이후여야 해요.";
    if (link && !/^https?:\/\/\S+$/.test(link)) return "외부 링크는 http(s)://로 시작해야 해요.";
    return null;
  }

  const save = useMutation({
    mutationFn: (publishMode: NoticeInput["publishMode"]) => {
      const body: NoticeInput = {
        title: title.trim(),
        blocks: clean,
        categoryIds,
        eventStartAt: fromLocalInput(eventStart),
        eventEndAt: fromLocalInput(eventEnd),
        deadlineAt: fromLocalInput(deadline),
        location,
        externalLink: link,
        urgent,
        publishMode,
        publishAt: publishMode === "SCHEDULED" ? fromLocalInput(publishAt) : null,
      };
      return initial
        ? api<AdminNotice>(`/admin/notices/${initial.id}`, { method: "PUT", body })
        : api<AdminNotice>("/admin/notices", { method: "POST", body });
    },
    onSuccess: (_n, publishMode) => {
      toast(publishMode === "DRAFT" ? "임시저장했어요." : publishMode === "SCHEDULED" ? "예약 게시를 등록했어요." : "공지를 저장했어요.");
      router.replace("/admin/notices");
    },
    onError: (e) => setError(e.message),
  });

  // a draft or scheduled notice is published via the primary button; a live notice just saves in place
  const primaryMode: NoticeInput["publishMode"] = published ? null : mode;

  function submit(publishMode: NoticeInput["publishMode"]) {
    // drafts only need a title; everything else may still be missing
    const problem = publishMode === "DRAFT" ? (title.trim() ? null : "제목을 입력해 주세요.") : problems(true);
    if (problem) return setError(problem);
    setError("");
    save.mutate(publishMode);
  }

  function toPublish() {
    const problem = writeProblems();
    if (problem) return setError(problem);
    setError("");
    setStep("publish");
  }

  function backToWrite() {
    setError("");
    setStep("write");
  }

  function leave() {
    if (dirty && !confirm("작성 중인 내용이 저장되지 않아요. 나갈까요?")) return;
    router.push("/admin/notices");
  }

  async function upload(files: FileList): Promise<string[]> {
    if (countImages(blocks) + files.length > MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
      return [];
    }
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    setUploading(true);
    setError("");
    try {
      return (await api<{ urls: string[] }>("/admin/uploads/images", { method: "POST", body: form })).urls;
    } catch (e) {
      setError((e as Error).message);
      return [];
    } finally {
      setUploading(false);
    }
  }

  /** Fill the body with a template: replaces an empty body, otherwise appended as a new text block. */
  function applyTemplate(text: string) {
    const empty = !blocks.some((b) => (b.type === "TEXT" ? b.text.trim() !== "" : b.images.length > 0));
    if (empty) setBlocks([{ type: "TEXT", text, key: newKey() }]);
    else setBlocks([...blocks, { type: "TEXT", text, key: newKey() }]);
    toast(empty ? "템플릿을 넣었어요. [대괄호] 부분을 바꿔 주세요." : "본문 맨 아래에 템플릿을 추가했어요.");
  }

  const addBlock = (type: "TEXT" | "IMAGES") =>
    setBlocks([...blocks, type === "TEXT" ? { type, text: "", key: newKey() } : { type, images: [], layout: "CAROUSEL", key: newKey() }]);

  return {
    categoryIds, setCategoryIds, title, setTitle, blocks, setBlocks, eventStart, setEventStart, eventEnd, setEventEnd,
    deadline, setDeadline, location, setLocation, link, setLink, urgent, setUrgent, mode, setMode, publishAt, setPublishAt,
    step, error, uploading, published, clean, primaryMode, saving: save.isPending,
    submit, toPublish, backToWrite, leave, upload, applyTemplate, addBlock,
  };
}

export type NoticeFormState = ReturnType<typeof useNoticeForm>;
