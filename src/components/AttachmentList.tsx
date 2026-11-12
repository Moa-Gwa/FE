import Icon from "@/components/Icon";
import { attachmentUrl, fileExtension } from "@/lib/attachments";
import type { NoticeAttachment } from "@/types";

export default function AttachmentList({ attachments }: { attachments?: NoticeAttachment[] | null }) {
  const files = (attachments ?? []).flatMap(file => {
    const url = attachmentUrl(file.url);
    return url ? [{ ...file, url }] : [];
  });
  if (!files.length) return null;

  return <section className="notice-attachments" aria-label="첨부파일">
    <h2>첨부파일 <span>{files.length}</span></h2>
    <ul>
      {files.map((file, i) => {
        const extension = fileExtension(file.fileName);
        return <li key={`${file.url}-${i}`}>
          <a href={file.url} target="_blank" rel="noopener noreferrer" aria-label={`${file.fileName || "첨부파일"} 다운로드 (원문 사이트, 새 창)`}>
            <span className="attachment-file-icon" aria-hidden="true"><Icon name="file" /><span>{extension}</span></span>
            <span className="attachment-name">{file.fileName || "첨부파일"}</span>
            <span className="attachment-download" aria-hidden="true"><Icon name="download" /></span>
          </a>
        </li>;
      })}
    </ul>
    <p>원문 사이트에서 파일을 확인하거나 내려받을 수 있어요.</p>
  </section>;
}
