"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useToast } from "@/components/Providers";
import Icon from "@/components/Icon";
import ShareModal from "@/components/ShareModal";
import StatusBadge from "@/components/StatusBadge";
import TopBar from "@/components/TopBar";
import { useCategories } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { AdminNotice } from "@/types";

const TABS = [
  ["all", "전체"],
  ["active", "진행 중"],
  ["scheduled", "예약"],
  ["closed", "마감"],
  ["draft", "임시저장"],
];
const STATUS_TEXT: Record<string, string> = { DRAFT: "임시저장", SCHEDULED: "예약", PUBLISHED: "게시", CLOSED: "마감" };

function Notices() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { byCode } = useCategories();
  const tab = params.get("tab") ?? "all";
  const [q, setQ] = useState("");
  const [sharing, setSharing] = useState<AdminNotice | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  // close the row menu on any outside click / Escape
  useEffect(() => {
    if (menu === null) return;
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e instanceof MouseEvent && (e.target as Element).closest(".more-wrap")) return;
      setMenu(null);
    };
    document.addEventListener("click", off);
    document.addEventListener("keydown", off);
    return () => {
      document.removeEventListener("click", off);
      document.removeEventListener("keydown", off);
    };
  }, [menu]);

  const query = useQuery({
    queryKey: ["admin", "notices", tab, q],
    queryFn: () => api<AdminNotice[]>(`/admin/notices?tab=${tab}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  });
  const done = (message: string) => () => {
    toast(message);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const close = useMutation({ mutationFn: (id: number) => api<void>(`/admin/notices/${id}/close`, { method: "POST" }), onSuccess: done("공지를 마감했어요."), onError: (e) => toast(e.message) });
  const duplicate = useMutation({ mutationFn: (id: number) => api<void>(`/admin/notices/${id}/duplicate`, { method: "POST" }), onSuccess: done("공지를 복제했어요. 임시저장 상태예요."), onError: (e) => toast(e.message) });
  const remove = useMutation({ mutationFn: (id: number) => api<void>(`/admin/notices/${id}`, { method: "DELETE" }), onSuccess: done("공지를 삭제했어요."), onError: (e) => toast(e.message) });

  return (
    <>
      <TopBar title="공지 관리" sub="공지의 게시 상태와 내용을 관리할 수 있어요." />
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? "on" : ""}`} onClick={() => router.replace(`/admin/notices?tab=${key}`)}>
            {label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목 검색" aria-label="공지 검색" />
        <Link className="primary" href="/admin/notices/new">
          + 새 공지 작성
        </Link>
      </div>

      {query.isPending ? (
        <div className="empty">불러오는 중…</div>
      ) : query.isError ? (
        <div className="error">{(query.error as Error).message}</div>
      ) : query.data.length === 0 ? (
        <div className="empty">해당하는 공지가 없어요.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>공지</th>
                <th>카테고리</th>
                <th>작성일</th>
                <th>상태</th>
                <th>반응</th>
                <th aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {query.data.map((n) => (
                <tr key={n.id}>
                  <td className="col-title">
                    <strong>{n.title}</strong>
                  </td>
                  <td className="col-cat">
                    {n.categoryCodes.map((c) => (
                      <span className="tag" key={c} style={{ marginRight: 4 }}>
                        {byCode(c)}
                      </span>
                    ))}
                  </td>
                  <td className="col-date">{fmtDate(n.createdAt)}</td>
                  <td className="col-status">
                    <span className={`status ${n.status === "DRAFT" ? "draft" : ""}`}>{STATUS_TEXT[n.status]}</span>{" "}
                    <StatusBadge status={n.status === "PUBLISHED" ? n.displayStatus : null} urgent={n.urgent} />
                  </td>
                  <td className="col-count">
                    조회 {n.viewCount} · 저장 {n.bookmarkCount}
                  </td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <Link href={`/admin/notices/${n.id}/edit`} className="row-edit">
                        수정
                      </Link>
                      <div className="more-wrap">
                        <button
                          className="row-more"
                          aria-label="더보기"
                          aria-haspopup="menu"
                          aria-expanded={menu === n.id}
                          onClick={() => setMenu(menu === n.id ? null : n.id)}
                        >
                          <Icon name="dots" />
                        </button>
                        {menu === n.id && (
                          <div className="row-menu" role="menu" onClick={() => setMenu(null)}>
                            {n.status === "PUBLISHED" && (
                              <button role="menuitem" onClick={() => close.mutate(n.id)}>
                                마감 처리
                              </button>
                            )}
                            {(n.status === "PUBLISHED" || n.status === "CLOSED") && (
                              <button role="menuitem" onClick={() => setSharing(n)}>
                                공유
                              </button>
                            )}
                            <button role="menuitem" onClick={() => duplicate.mutate(n.id)}>
                              복제
                            </button>
                            <button role="menuitem" className="danger-text" onClick={() => confirm("이 공지를 삭제할까요?") && remove.mutate(n.id)}>
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sharing && <ShareModal notice={sharing} onClose={() => setSharing(null)} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Notices />
    </Suspense>
  );
}
