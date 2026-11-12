"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { ORG_TYPE_LABEL } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { AdminOrg } from "@/types";

function OrgForm({ org }: { org: AdminOrg }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [description, setDescription] = useState(org.description ?? "");
  const [externalUrl, setExternalUrl] = useState(org.externalUrl ?? "");
  const save = useMutation({
    mutationFn: () =>
      api<AdminOrg>("/admin/organization", { method: "PUT", body: { description, profileImage: org.profileImage ?? "", externalUrl } }),
    onSuccess: () => {
      toast("단체 정보를 저장했어요.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e) => toast(e.message),
  });

  return (
    <form
      className="form-card stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="section-heading">
        <h2>단체 정보</h2>
        <span className="pill">{ORG_TYPE_LABEL[org.type]}</span>
      </div>
      <div className="form-group">
        <label>단체명</label>
        <input value={org.name} readOnly />
        <span className="hint">단체명 변경은 운영팀에 문의해 주세요.</span>
      </div>
      <div className="form-group">
        <label htmlFor="desc">소개</label>
        <textarea id="desc" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="url">공식 홈페이지 / SNS</label>
        <input id="url" type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" />
      </div>
      <div className="form-actions">
        <button className="primary" disabled={save.isPending}>
          저장
        </button>
      </div>
    </form>
  );
}

export default function OrganizationPage() {
  const session = useSession();
  const query = useQuery({ queryKey: ["admin", "organization"], queryFn: () => api<AdminOrg>("/admin/organization") });

  return (
    <>
      <TopBar title="조직 관리" sub="공지를 발행하는 단체 정보를 관리합니다." />
      <div className="grid two">
        {query.data ? <OrgForm key={query.data.id} org={query.data} /> : <div className="empty">불러오는 중…</div>}
        <aside className="insight">
          <div className="eyebrow">ACCOUNT</div>
          <h3>관리자 정보</h3>
          <p>
            로그인 계정: <b>{session?.name}</b>
            <br />이 계정은 <b>{query.data?.name ?? "소속 조직"}</b> 한 곳의 공지만 작성·수정·마감·삭제할 수 있어요.
          </p>
          <p>공지 템플릿·카테고리 관리·통계 상세는 다음 버전에서 제공돼요.</p>
        </aside>
      </div>
    </>
  );
}
