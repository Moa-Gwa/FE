import type { ReactNode } from "react";

/** TDS Badge 기준. 기본 weak, fill은 강조가 꼭 필요한 곳에만. 크기는 목록 안 xsmall, 상세 small */
export type BadgeColor = "blue" | "yellow" | "elephant" | "red";

export default function Badge({
  color = "elephant",
  variant = "weak",
  size = "xsmall",
  label,
  children,
}: {
  color?: BadgeColor;
  variant?: "weak" | "fill";
  size?: "xsmall" | "small";
  /** 스크린리더용 설명(예: "안 읽은 메시지 12개") */
  label?: string;
  children: ReactNode;
}) {
  // span의 aria-label은 스크린리더가 무시하는 경우가 있어 숨김 글자로 대체
  return (
    <span className={`badge ${size} ${color} ${variant}`}>
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}
