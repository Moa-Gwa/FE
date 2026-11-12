import Badge, { type BadgeColor } from "@/components/Badge";
import { STATUS_LABEL } from "@/lib/format";
import type { DisplayStatus } from "@/types";

/** 같은 뜻은 어느 화면에서나 같은 색: 중요 blue, 마감 임박 yellow, 그 외 elephant */
const STATUS_COLOR: Record<DisplayStatus, BadgeColor> = {
  UPCOMING: "elephant",
  ONGOING: "elephant",
  DEADLINE_SOON: "yellow",
  CLOSED: "elephant",
  ENDED: "elephant",
};

export default function StatusBadge({ status, urgent, size }: { status: DisplayStatus | null; urgent?: boolean; size?: "xsmall" | "small" }) {
  return (
    <>
      {urgent && (
        <Badge color="blue" size={size}>
          중요
        </Badge>
      )}
      {status && (
        <Badge color={STATUS_COLOR[status]} size={size}>
          {STATUS_LABEL[status]}
        </Badge>
      )}
    </>
  );
}
