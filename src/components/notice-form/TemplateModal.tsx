"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { NOTICE_TEMPLATES } from "@/lib/noticeTemplates";

export default function TemplateModal({ onApply, onClose }: { onApply: (text: string) => void; onClose: () => void }) {
  const [templateId, setTemplateId] = useState(NOTICE_TEMPLATES[0].id);
  const selected = NOTICE_TEMPLATES.find((t) => t.id === templateId)!;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal tpl-modal" role="dialog" aria-modal="true" aria-label="템플릿 선택" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-head">
          <h2>템플릿 고르기</h2>
          <button type="button" className="icon-button" aria-label="닫기" onClick={onClose}>
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
          <pre className="tpl-preview">{selected.text}</pre>
        </div>
        <div className="tpl-foot">
          <span className="hint">본문이 비어 있으면 채우고, 내용이 있으면 맨 아래에 추가해요.</span>
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button type="button" className="primary" onClick={() => onApply(selected.text)}>
            이 템플릿 쓰기
          </button>
        </div>
      </div>
    </div>
  );
}
