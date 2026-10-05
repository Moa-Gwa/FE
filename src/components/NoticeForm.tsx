/* eslint-disable @next/next/no-img-element */
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Providers";
import { useCategories } from "@/hooks/useMeta";
import { api, assetUrl } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import type { AdminNotice, NoticeInput } from "@/types";

const TEMPLATE = "■ 일시: \n■ 장소: \n■ 대상: \n■ 신청 방법: \n■ 문의: ";
const MAX_IMAGES = 10;

export default function NoticeForm({ initial }: { initial: AdminNotice | null }) {
  const router = useRouter();
  const toast = useToast();
  const { categories } = useCategories();

  const [categoryIds, setCategoryIds] = useState<number[]>(initial?.categoryIds ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [images, setImages] = useState<string[]>(initial?.imageUrls ?? []);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eventStart, setEventStart] = useState(toLocalInput(initial?.eventStartAt ?? null));
  const [eventEnd, setEventEnd] = useState(toLocalInput(initial?.eventEndAt ?? null));
  const [deadline, setDeadline] = useState(toLocalInput(initial?.deadlineAt ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [link, setLink] = useState(initial?.externalLink ?? "");
  const [urgent, setUrgent] = useState(initial?.urgent ?? false);
  const [mode, setMode] = useState<"NOW" | "SCHEDULED">(initial?.status === "SCHEDULED" ? "SCHEDULED" : "NOW");
  const [publishAt, setPublishAt] = useState(toLocalInput(initial?.status === "SCHEDULED" ? initial.publishAt : null));
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const published = initial?.status === "PUBLISHED" || initial?.status === "CLOSED";

  function problems(forPublish: boolean): string | null {
    if (categoryIds.length === 0) return "카테고리를 1개 이상 선택해 주세요.";
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!description.trim()) return "본문을 입력해 주세요.";
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
        description,
        categoryIds,
        imageUrls: images,
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

  function submit(publishMode: NoticeInput["publishMode"]) {
    const problem = problems(publishMode !== "DRAFT");
    if (problem) return setError(problem);
    setError("");
    save.mutate(publishMode);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > MAX_IMAGES) return setError(`이미지는 최대 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    setUploading(true);
    setError("");
    try {
      const res = await api<{ urls: string[] }>("/admin/uploads/images", { method: "POST", body: form });
      setImages((cur) => [...cur, ...res.urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const move = (i: number, d: number) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // a draft or scheduled notice is published via the primary button; a live notice just saves in place
  const primaryMode: NoticeInput["publishMode"] = published ? null : mode;

  return (
    <>
      <form
        className="form-card stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit(primaryMode);
        }}
      >
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>카테고리 (1개 이상)</label>
          <div className="chips">
            {categories.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${categoryIds.includes(c.id) ? "on" : ""}`}
                onClick={() => setCategoryIds((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input id="title" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목을 입력해 주세요" />
          <div className="counter">{title.length} / 40</div>
        </div>

        <div className="form-group">
          <label>이미지 (JPG·PNG·WEBP, 최대 {MAX_IMAGES}장)</label>
          <div className="upload-grid">
            {images.map((url, i) => (
              <div className="upload-item" key={url}>
                <img src={assetUrl(url)} alt={`이미지 ${i + 1}`} />
                <div className="ops">
                  <button type="button" aria-label="앞으로" onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button type="button" aria-label="삭제" onClick={() => setImages((cur) => cur.filter((x) => x !== url))}>
                    삭제
                  </button>
                  <button type="button" aria-label="뒤로" onClick={() => move(i, 1)}>
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading || images.length >= MAX_IMAGES} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          {uploading && <span className="hint">업로드 중…</span>}
        </div>

        <div className="form-group">
          <div className="row-between">
            <label htmlFor="desc">본문</label>
            <button type="button" className="link-btn" onClick={() => !description && setDescription(TEMPLATE)}>
              템플릿 넣기
            </button>
          </div>
          <textarea id="desc" rows={10} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="공지 내용을 입력해 주세요" />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="es">행사 시작</label>
            <input id="es" type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="ee">행사 종료</label>
            <input id="ee" type="datetime-local" value={eventEnd} min={eventStart} onChange={(e) => setEventEnd(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="dl">신청 마감</label>
            <input id="dl" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="loc">장소</label>
            <input id="loc" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} placeholder="예: 학생회관 앞 광장" />
          </div>
          <div className="form-group full">
            <label htmlFor="link">외부 링크</label>
            <input id="link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
          </div>
        </div>

        {!published && (
          <div className="form-group">
            <label>게시 방식</label>
            <div className="radio-row">
              <label>
                <input type="radio" name="mode" checked={mode === "NOW"} onChange={() => setMode("NOW")} /> 즉시 게시
              </label>
              <label>
                <input type="radio" name="mode" checked={mode === "SCHEDULED"} onChange={() => setMode("SCHEDULED")} /> 예약 게시
              </label>
            </div>
            {mode === "SCHEDULED" && <input type="datetime-local" aria-label="예약 시각" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />}
          </div>
        )}

        <label className="check">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          중요 공지 (학내 NOW 우선 노출, 알림 우선 발송)
        </label>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => router.push("/admin/notices")}>
            취소
          </button>
          <button type="button" className="secondary" onClick={() => setPreview(true)}>
            미리보기
          </button>
          {!published && (
            <button type="button" className="secondary" disabled={save.isPending} onClick={() => submit("DRAFT")}>
              임시저장
            </button>
          )}
          <button className="primary" disabled={save.isPending}>
            {published ? "변경사항 저장" : mode === "SCHEDULED" ? "예약 게시" : "게시"}
          </button>
        </div>
      </form>

      {preview && (
        <div className="modal-back" onClick={() => setPreview(false)}>
          <div className="modal" role="dialog" aria-label="미리보기" onClick={(e) => e.stopPropagation()}>
            <div className="chips">
              {categoryIds.map((id) => (
                <span className="pill" key={id}>
                  {categories.find((c) => c.id === id)?.name}
                </span>
              ))}
              {urgent && <span className="pill red">중요</span>}
            </div>
            <h1 style={{ fontSize: 22, margin: "12px 0" }}>{title || "(제목 없음)"}</h1>
            {images[0] && <img className="thumb" style={{ height: "auto", maxHeight: 280, objectFit: "contain" }} src={assetUrl(images[0])} alt="" />}
            <div className="detail-body">{description || "(본문 없음)"}</div>
            {location && <p className="muted">장소: {location}</p>}
            <div className="form-actions">
              <button className="secondary" onClick={() => setPreview(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
