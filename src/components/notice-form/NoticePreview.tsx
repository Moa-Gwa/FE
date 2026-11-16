import Badge from "@/components/Badge";
import BlocksView from "@/components/BlocksView";
import type { NoticeFormState } from "@/components/notice-form/useNoticeForm";

export default function NoticePreview({ form, catNames }: { form: NoticeFormState; catNames: string[] }) {
  return (
    <aside className="writer-preview" aria-label="미리보기">
      <div className="writer-inner">
        <div className="wp-label">학생에게 보이는 모습</div>
        <div className="wp-badges">
          {form.urgent && (
            <Badge color="blue" size="small">
              중요
            </Badge>
          )}
          <span className="tag-list">
            {catNames.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </div>
        <h1 className="wp-title">{form.title || <span className="wp-empty">제목</span>}</h1>
        {form.clean.length ? <BlocksView blocks={form.clean} /> : <p className="wp-empty">본문을 입력하면 여기에 보여요.</p>}
        {form.location && <p className="wp-extra">장소 · {form.location}</p>}
      </div>
    </aside>
  );
}
