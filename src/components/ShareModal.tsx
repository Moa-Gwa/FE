"use client";

import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/Providers";
import type { AdminNotice } from "@/types";

/** Share link, ready-to-paste text for KakaoTalk / Everytime, and a QR code. */
export default function ShareModal({ notice, onClose }: { notice: AdminNotice; onClose: () => void }) {
  const toast = useToast();
  const url = `${window.location.origin}/notices/manual/${notice.id}`;
  const text = `[모아과 공지] ${notice.title}\n${notice.description.slice(0, 80)}${notice.description.length > 80 ? "…" : ""}\n👉 ${url}`;

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast(message);
    } catch {
      toast("복사하지 못했어요. 직접 선택해서 복사해 주세요.");
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="공지 공유" onClick={(e) => e.stopPropagation()}>
        <div className="section-heading">
          <h2>공지 공유</h2>
        </div>
        <div className="stack">
          <div className="form-group">
            <label>링크</label>
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
            <button className="secondary" onClick={() => copy(url, "링크를 복사했어요.")}>
              링크 복사
            </button>
          </div>
          <div className="form-group">
            <label>카카오톡·에브리타임용 문구</label>
            <textarea readOnly rows={4} value={text} onFocus={(e) => e.target.select()} />
            <button className="secondary" onClick={() => copy(text, "문구를 복사했어요.")}>
              문구 복사
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <QRCodeSVG value={url} size={150} />
          </div>
        </div>
        <div className="form-actions">
          <button className="secondary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
