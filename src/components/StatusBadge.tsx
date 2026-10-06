import { STATUS_LABEL, STATUS_TONE } from "@/lib/format";
import type { DisplayStatus } from "@/types";

export default function StatusBadge({ status, urgent }: { status: DisplayStatus | null; urgent?: boolean }) {
  return (
    <>
      {urgent && <span className="pill hot">중요</span>}
      {status && <span className={`pill ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>}
    </>
  );
}
