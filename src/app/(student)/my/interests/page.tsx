"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { useCategories, useOrganizations } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import type { Profile } from "@/types";

function toggle(list: number[], id: number) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function InterestsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const welcome = useSearchParams().get("welcome");
  const { categories } = useCategories();
  const departments = useOrganizations("DEPARTMENT");
  const councils = useOrganizations("STUDENT_GOVERNMENT");

  const [nickname, setNickname] = useState(profile.nickname);
  const [primary, setPrimary] = useState<number | null>(profile.primaryDepartmentId);
  const [year, setYear] = useState(profile.admissionYear?.toString() ?? "");
  const [depts, setDepts] = useState(profile.departmentIds);
  const [orgs, setOrgs] = useState(profile.organizationIds);
  const [cats, setCats] = useState(profile.categoryIds);
  const [deptFilter, setDeptFilter] = useState("");

  const save = useMutation({
    mutationFn: () =>
      api<Profile>("/me/profile", {
        method: "PUT",
        body: {
          nickname,
          primaryDepartmentId: primary,
          admissionYear: year ? Number(year) : null,
          departmentIds: depts,
          organizationIds: orgs,
          categoryIds: cats,
        },
      }),
    onSuccess: (p) => {
      const s = getSession();
      if (s) setSession({ ...s, name: p.nickname, onboarded: p.primaryDepartmentId !== null });
      qc.invalidateQueries();
      toast("관심정보를 저장했어요.");
      router.replace("/home");
    },
    onError: (e) => toast(e.message),
  });

  const shownDepts = (departments.data ?? []).filter((d) => d.name.includes(deptFilter.trim()));

  return (
    <>
      <TopBar
        title={welcome ? "환영해요! 관심정보를 설정해 주세요" : "관심정보 설정"}
        sub="주전공과 관심 학과·단체를 고르면 '나를 위한 공지'를 보여드려요."
      />
      <form
        className="form-card stack"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nick">닉네임</label>
            <input id="nick" value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="year">입학년도 (선택)</label>
            <input id="year" type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="예: 2024" />
          </div>
          <div className="form-group full">
            <label htmlFor="primary">주전공 (1개)</label>
            <select id="primary" value={primary ?? ""} onChange={(e) => setPrimary(e.target.value ? Number(e.target.value) : null)}>
              <option value="">선택 안 함</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <span className="hint">복수전공·전과 예정이라면 아래 관심 학과에 추가하세요.</span>
          </div>
        </div>

        <div className="form-group">
          <label>관심 학과 (여러 개)</label>
          <input className="field" placeholder="학과 검색" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} />
          <div className="chips" style={{ maxHeight: 180, overflow: "auto" }}>
            {shownDepts.map((d) => (
              <button type="button" key={d.id} className={`chip ${depts.includes(d.id) ? "on" : ""}`} onClick={() => setDepts(toggle(depts, d.id))}>
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>관심 학생자치단체</label>
          <div className="chips">
            {(councils.data ?? []).map((o) => (
              <button type="button" key={o.id} className={`chip ${orgs.includes(o.id) ? "on" : ""}`} onClick={() => setOrgs(toggle(orgs, o.id))}>
                {o.name}
              </button>
            ))}
            {councils.data?.length === 0 && <span className="hint">등록된 학생자치단체가 아직 없어요.</span>}
          </div>
        </div>

        <div className="form-group">
          <label>관심 카테고리</label>
          <div className="chips">
            {categories.map((c) => (
              <button type="button" key={c.id} className={`chip ${cats.includes(c.id) ? "on" : ""}`} onClick={() => setCats(toggle(cats, c.id))}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => router.back()}>
            취소
          </button>
          <button className="primary" disabled={save.isPending}>
            저장
          </button>
        </div>
      </form>
    </>
  );
}

function Loader() {
  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: () => api<Profile>("/me/profile") });
  if (!profile.data) return <div className="empty">불러오는 중…</div>;
  return <InterestsForm profile={profile.data} />;
}

export default function Page() {
  return (
    <Suspense>
      <Loader />
    </Suspense>
  );
}
