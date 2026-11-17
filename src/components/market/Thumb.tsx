/* eslint-disable @next/next/no-img-element */
import { assetUrl } from "@/lib/api";

/** 사진은 등록 시 필수라 색이나 아이콘 대신 회색 바탕에 사진만 보인다. veil: 예약 중, 판매 완료처럼 썸네일을 어둡게 덮고 상태 글자 표시 */
export default function Thumb({
  src,
  size = 88,
  faded = false,
  veil,
}: {
  src?: string | null;
  size?: number;
  faded?: boolean;
  veil?: string;
}) {
  return (
    <span className={`life-thumb ${faded ? "faded" : ""}`} style={{ width: size, height: size }}>
      {src && <img src={assetUrl(src)} alt="" />}
      {veil && <span className="life-thumb-veil">{veil}</span>}
    </span>
  );
}
