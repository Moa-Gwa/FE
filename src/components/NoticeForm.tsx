"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import { useCategories } from "@/hooks/useMeta";
import BlocksEditor, { countImages, MAX_IMAGES, newKey, type EditorBlock } from "@/components/BlocksEditor";
import BlocksView from "@/components/BlocksView";
import DateTimeField from "@/components/DateTimeField";
import { api, assetUrl } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { NOTICE_TEMPLATES } from "@/lib/noticeTemplates";
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
    .map((b): Block => (b.type === "TEXT" ? { type: "TEXT", text: b.text } : { type: "IMAGES", images: b.images, layout: b.layout }))
    .filter((b) => (b.type === "TEXT" ? b.text.trim() !== "" : b.images.length > 0));

export default function NoticeForm({ initial }: { initial: AdminNotice | null }) {
  const router = useRouter();
  const toast = useToast();
  const { categories } = useCategories();

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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateId, setTemplateId] = useState(NOTICE_TEMPLATES[0].id);
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const published = initial?.status === "PUBLISHED" || initial?.status === "CLOSED";
  const clean = useMemo(() => cleanBlocks(blocks), [blocks]);

  // "dirty" = anything typed since the page opened; used to confirm before leaving
  const [snapshot] = useState(() => JSON.stringify([initial?.title ?? "", cleanBlocks(initialBlocks(initial))]));
  const dirty = JSON.stringify([title, clean]) !== snapshot;

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

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
    setTemplateOpen(false);
  }

  const addBlock = (type: "TEXT" | "IMAGES") =>
    setBlocks([...blocks, type === "TEXT" ? { type, text: "", key: newKey() } : { type, images: [], layout: "CAROUSEL", key: newKey() }]);

  const catNames = categoryIds.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean);
  const firstImage = clean.find((b) => b.type === "IMAGES");
  const excerpt = (clean.find((b) => b.type === "TEXT") as Extract<Block, { type: "TEXT" }> | undefined)?.text.replace(/\s+/g, " ").slice(0, 120);
  const primaryLabel = published ? "변경사항 저장" : mode === "SCHEDULED" ? "예약 게시" : "게시하기";

  return (
    <div className={`writer ${showPreview ? "" : "no-preview"}`}>
      {/* ---------- write: title + body, live preview on the right ---------- */}
      <section className="writer-edit" aria-label="공지 작성">
        <div className="writer-scroll">
          <div className="writer-inner">
            <textarea
              ref={titleRef}
              className="writer-title"
              rows={1}
              value={title}
              maxLength={40}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
              placeholder="제목을 입력하세요"
              aria-label="제목"
            />
            <div className="writer-rule" aria-hidden="true" />
            <div className="writer-meta">
              <span className="counter">{title.length} / 40</span>
              {initial && <span className="writer-status">{published ? "게시 중인 공지 수정" : "임시저장된 공지"}</span>}
            </div>

            <div className="writer-toolbar" role="toolbar" aria-label="본문 도구">
              <button type="button" onClick={() => addBlock("TEXT")}>
                <Icon name="edit" /> 글
              </button>
              <button type="button" disabled={countImages(blocks) >= MAX_IMAGES} onClick={() => addBlock("IMAGES")}>
                <Icon name="grid" /> 이미지
              </button>
              <span className="tb-sep" />
              <button type="button" onClick={() => setTemplateOpen(true)}>
                템플릿
              </button>
              <button type="button" className="tb-preview" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "미리보기 닫기" : "미리보기"}
              </button>
            </div>

            {error && step === "write" && <div className="error writer-error">{error}</div>}
            <BlocksEditor blocks={blocks} onChange={setBlocks} onUpload={upload} uploading={uploading} />
          </div>
        </div>

        <footer className="writer-foot">
          <button type="button" className="writer-exit" onClick={leave}>
            <Icon name="chevron" /> 나가기
          </button>
          <div className="writer-foot-actions">
            {!published && (
              <button type="button" className="ghost" disabled={save.isPending} onClick={() => submit("DRAFT")}>
                임시저장
              </button>
            )}
            <button type="button" className="primary" onClick={toPublish}>
              {published ? "저장하기" : "게시하기"}
            </button>
          </div>
        </footer>
      </section>

      <aside className="writer-preview" aria-label="미리보기">
        <div className="writer-inner">
          <div className="wp-label">학생에게 보이는 모습</div>
          <div className="wp-badges">
            {urgent && <span className="pill hot">중요</span>}
            {catNames.map((n) => (
              <span className="pill" key={n}>
                {n}
              </span>
            ))}
          </div>
          <h1 className="wp-title">{title || <span className="wp-empty">제목</span>}</h1>
          {clean.length ? <BlocksView blocks={clean} /> : <p className="wp-empty">본문을 입력하면 여기에 보여요.</p>}
          {location && <p className="wp-extra">장소 · {location}</p>}
        </div>
      </aside>

      {templateOpen && (
        <div className="modal-back" onClick={() => setTemplateOpen(false)}>
          <div className="modal tpl-modal" role="dialog" aria-modal="true" aria-label="템플릿 선택" onClick={(e) => e.stopPropagation()}>
            <div className="tpl-head">
              <h2>템플릿 고르기</h2>
              <button type="button" className="icon-button" aria-label="닫기" onClick={() => setTemplateOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="tpl-body">
              <ul className="tpl-list" role="listbox" aria-label="템플릿">
                {NOTICE_TEMPLATES.map((t) => (
                  <li key={t.id}>
                    <button type="button" role="option" aria-selected={t.id === templateId} className={t.id === templateId ? "on" : ""} onClick={() => setTemplateId(t.id)}>
                      <b>{t.name}</b>
                      <span>{t.desc}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <pre className="tpl-preview">{NOTICE_TEMPLATES.find((t) => t.id === templateId)?.text}</pre>
            </div>
            <div className="tpl-foot">
              <span className="hint">본문이 비어 있으면 채우고, 내용이 있으면 맨 아래에 추가해요.</span>
              <button type="button" className="ghost" onClick={() => setTemplateOpen(false)}>
                취소
              </button>
              <button type="button" className="primary" onClick={() => applyTemplate(NOTICE_TEMPLATES.find((t) => t.id === templateId)!.text)}>
                이 템플릿 쓰기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- publish: settings step (velog "출간" screen) ---------- */}
      {step === "publish" && (
        <div className="publish" role="dialog" aria-modal="true" aria-label="게시 설정">
          <div className="publish-inner">
            <section className="publish-col">
              <h2>공지 미리보기</h2>
              <div className={`pub-thumb ${firstImage ? "" : "none"}`}>
                {firstImage && firstImage.type === "IMAGES" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(firstImage.images[0])} alt="" />
                ) : (
                  <span>대표 이미지 없음</span>
                )}
              </div>
              <h3 className="pub-title">{title}</h3>
              <p className="pub-excerpt">{excerpt}</p>
              <label className="pub-toggle">
                <span>
                  <b>중요 공지</b>
                  <small>학내 NOW에 우선 노출되고 알림이 먼저 발송돼요.</small>
                </span>
                <button type="button" role="switch" aria-checked={urgent} className={`switch ${urgent ? "on" : ""}`} onClick={() => setUrgent(!urgent)}>
                  <i />
                </button>
              </label>
            </section>

            <section className="publish-col">
              <h2>게시 설정</h2>
              {error && <div className="error">{error}</div>}

              <div className="pub-field">
                <span className="pub-label">카테고리 (1개 이상)</span>
                <div className="chips">
                  {categories.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`chip ${categoryIds.includes(c.id) ? "on" : ""}`}
                      aria-pressed={categoryIds.includes(c.id)}
                      onClick={() => setCategoryIds((cur) => (cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id]))}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pub-grid">
                <div className="pub-field">
                  <span className="pub-label">행사 시작</span>
                  <DateTimeField ariaLabel="행사 시작" value={eventStart} onChange={setEventStart} placeholder="선택 안 함" />
                </div>
                <div className="pub-field">
                  <span className="pub-label">행사 종료</span>
                  <DateTimeField ariaLabel="행사 종료" value={eventEnd} min={eventStart || undefined} onChange={setEventEnd} placeholder="선택 안 함" />
                </div>
                <div className="pub-field">
                  <span className="pub-label">신청 마감</span>
                  <DateTimeField ariaLabel="신청 마감" value={deadline} onChange={setDeadline} placeholder="선택 안 함" />
                </div>
                <label className="pub-field">
                  <span className="pub-label">장소</span>
                  <input value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} placeholder="예: 학생회관 앞 광장" />
                </label>
              </div>
              <label className="pub-field">
                <span className="pub-label">외부 링크</span>
                <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
              </label>

              {!published && (
                <div className="pub-field">
                  <span className="pub-label">게시 방식</span>
                  <div className="pub-seg" role="radiogroup" aria-label="게시 방식">
                    <button type="button" role="radio" aria-checked={mode === "NOW"} className={mode === "NOW" ? "on" : ""} onClick={() => setMode("NOW")}>
                      즉시 게시
                    </button>
                    <button type="button" role="radio" aria-checked={mode === "SCHEDULED"} className={mode === "SCHEDULED" ? "on" : ""} onClick={() => setMode("SCHEDULED")}>
                      예약 게시
                    </button>
                  </div>
                  {mode === "SCHEDULED" && <DateTimeField ariaLabel="예약 시각" value={publishAt} onChange={setPublishAt} placeholder="게시할 시각을 선택하세요" />}
                </div>
              )}

              <div className="publish-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setError("");
                    setStep("write");
                  }}
                >
                  취소
                </button>
                <button type="button" className="primary" disabled={save.isPending} onClick={() => submit(primaryMode)}>
                  {primaryLabel}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
