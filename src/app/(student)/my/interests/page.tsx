"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { useCategories, useOrganizations } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import type { Profile } from "@/types";

function toggle(list: number[], id: number) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

type Option = { id: number; name: string };

/** Multi-select list: search box + scrollable rows with a trailing check. Selected rows float to the top. */
function PickList({ options, value, onToggle, searchLabel, empty }: { options: Option[]; value: number[]; onToggle: (id: number) => void; searchLabel?: string; empty: string }) {
  const [q, setQ] = useState("");
  const shown = options
    .filter((o) => o.name.includes(q.trim()))
    .sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)));
  return (
    <div className="pick-body">
      {searchLabel && (
        <label className="pick-search">
          <Icon name="search" />
          <input placeholder={searchLabel} value={q} onChange={(e) => setQ(e.target.value)} aria-label={searchLabel} />
        </label>
      )}
      <ul className={`pick-list ${searchLabel ? "scroll" : ""}`} role="listbox" aria-multiselectable="true">
        {shown.map((o) => {
          const on = value.includes(o.id);
          return (
            <li key={o.id}>
              <button type="button" role="option" aria-selected={on} className={`pick-row ${on ? "on" : ""}`} onClick={() => onToggle(o.id)}>
                <span>{o.name}</span>
                <Icon name="check" />
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="hint pick-empty">{options.length ? "검색 결과가 없어요." : empty}</li>}
      </ul>
    </div>
  );
}

/** Single-select field that opens a bottom sheet with search. */
function SheetSelect({ id, options, value, onChange, placeholder }: { id: string; options: Option[]; value: number | null; onChange: (id: number | null) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.id === value);
  const shown = options.filter((o) => o.name.includes(q.trim()));
  const choose = (v: number | null) => {
    onChange(v);
    setOpen(false);
    setQ("");
  };
  return (
    <>
      <button type="button" id={id} className={`select-field ${current ? "" : "empty"}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span>{current?.name ?? placeholder}</span>
        <Icon name="down" />
      </button>
      {open && (
        <div className="sheet-back" onClick={() => setOpen(false)}>
          <section className="sheet select-sheet" role="dialog" aria-modal="true" aria-label="주전공 선택" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="row-between">
              <h2>주전공 선택</h2>
              <button type="button" className="icon-button" aria-label="닫기" onClick={() => setOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <label className="pick-search">
              <Icon name="search" />
              <input autoFocus placeholder="학과 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="학과 검색" />
            </label>
            <ul className="pick-list sheet-scroll" role="listbox">
              {!q && (
                <li>
                  <button type="button" role="option" aria-selected={value === null} className={`pick-row ${value === null ? "on" : ""}`} onClick={() => choose(null)}>
                    <span>선택 안 함</span>
                    <Icon name="check" />
                  </button>
                </li>
              )}
              {shown.map((o) => (
                <li key={o.id}>
                  <button type="button" role="option" aria-selected={o.id === value} className={`pick-row ${o.id === value ? "on" : ""}`} onClick={() => choose(o.id)}>
                    <span>{o.name}</span>
                    <Icon name="check" />
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="hint pick-empty">검색 결과가 없어요.</li>}
            </ul>
          </section>
        </div>
      )}
    </>
  );
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

  return (
    <>
      <TopBar
        title={welcome ? "환영해요! 관심정보를 설정해 주세요" : "관심정보 설정"}
        sub="주전공과 관심 학과·단체를 고르면 '나를 위한 공지'를 보여드려요."
      />
      <form
        className="interests"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <section className="section">
          <div className="section-heading">
            <h2>기본 정보</h2>
          </div>
          <div className="field-list">
            <div className="form-group">
              <label htmlFor="nick">닉네임</label>
              <input id="nick" value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="year">입학년도 (선택)</label>
              <input id="year" type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="예: 2024" />
            </div>
            <div className="form-group">
              <label htmlFor="primary">주전공</label>
              <SheetSelect id="primary" options={departments.data ?? []} value={primary} onChange={setPrimary} placeholder="주전공을 선택해 주세요" />
              <span className="hint">복수전공·전과 예정이라면 아래 관심 학과에 추가하세요.</span>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>관심 학과</h2>
            {depts.length > 0 && <span className="count">{depts.length}개 선택</span>}
          </div>
          <PickList options={departments.data ?? []} value={depts} onToggle={(id) => setDepts(toggle(depts, id))} searchLabel="학과 검색" empty="등록된 학과가 없어요." />
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>관심 학생자치단체</h2>
            {orgs.length > 0 && <span className="count">{orgs.length}개 선택</span>}
          </div>
          <PickList options={councils.data ?? []} value={orgs} onToggle={(id) => setOrgs(toggle(orgs, id))} empty="등록된 학생자치단체가 아직 없어요." />
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>관심 카테고리</h2>
            {cats.length > 0 && <span className="count">{cats.length}개 선택</span>}
          </div>
          <div className="chips pick-body">
            {categories.map((c) => (
              <button type="button" key={c.id} className={`chip ${cats.includes(c.id) ? "on" : ""}`} aria-pressed={cats.includes(c.id)} onClick={() => setCats(toggle(cats, c.id))}>
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <div className="cta-bar">
          <button type="button" className="ghost" onClick={() => router.back()}>
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
