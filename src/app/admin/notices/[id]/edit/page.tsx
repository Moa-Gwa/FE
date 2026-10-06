"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import NoticeForm from "@/components/NoticeForm";
import { api } from "@/lib/api";
import type { AdminNotice } from "@/types";

export default function EditNoticePage() {
  const { id } = useParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["admin", "notice", id],
    queryFn: () => api<AdminNotice>(`/admin/notices/${id}`),
    staleTime: Infinity, // do not refetch under the form while editing
  });

  return (
    <>
      {query.isPending && <div className="empty">불러오는 중…</div>}
      {query.isError && <div className="error">{(query.error as Error).message}</div>}
      {query.data && <NoticeForm key={query.data.id} initial={query.data} />}
    </>
  );
}
