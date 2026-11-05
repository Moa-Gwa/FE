"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import { api, assetUrl } from "@/lib/api";

/** 사진을 올리고 저장된 경로 목록을 부모에 돌려 준다. */
export default function ImagePicker({ urls, onChange, max = 5 }: { urls: string[]; onChange: (u: string[]) => void; max?: number }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files)
      .slice(0, max - urls.length)
      .forEach((f) => form.append("files", f));
    setBusy(true);
    try {
      const res = await api<{ urls: string[] }>("/market/uploads/images", { method: "POST", body: form });
      onChange([...urls, ...res.urls].slice(0, max));
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="life-photos">
      {urls.length < max && (
        <button type="button" className="life-photo add" onClick={() => input.current?.click()} disabled={busy}>
          <Icon name="camera" size={22} />
          <span>
            {urls.length}/{max}
          </span>
        </button>
      )}
      {urls.map((u) => (
        <span key={u} className="life-photo">
          <img src={assetUrl(u)} alt="" />
          <button type="button" aria-label="사진 삭제" onClick={() => onChange(urls.filter((x) => x !== u))}>
            ×
          </button>
        </span>
      ))}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
    </div>
  );
}
