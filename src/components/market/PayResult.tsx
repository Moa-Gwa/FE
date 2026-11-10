import Link from "next/link";
import Icon from "@/components/Icon";

/** 결제 결과 화면: 상태 아이콘, 제목, 설명, 모집으로 돌아가기 */
export default function PayResult({
  tone,
  title,
  description,
  backHref,
}: {
  tone: "loading" | "error" | "neutral";
  title: string;
  description?: string;
  backHref?: string;
}) {
  return (
    <section className="pay-result" role={tone === "error" ? "alert" : "status"}>
      <span className={`pay-result-icon ${tone}`} aria-hidden="true">
        <Icon name={tone === "loading" ? "clock" : "close"} size={28} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {backHref && (
        <Link href={backHref} className="life-btn">
          모집으로 돌아가기
        </Link>
      )}
    </section>
  );
}
