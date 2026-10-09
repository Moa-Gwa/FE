"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NoticeCard from "@/components/NoticeCard";
import PushToggleRow from "@/components/PushToggleRow";
import { useToast } from "@/components/Providers";
import TopBar from "@/components/TopBar";
import { useCategories, useOrganizations } from "@/hooks/useMeta";
import { api } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import { unregisterPushToken } from "@/lib/push";
import { setSession, useSession } from "@/lib/session";
import type { FeedItem, NotificationSettings, Profile } from "@/types";

const SETTINGS: [keyof NotificationSettings, string][] = [
  ["newNotice", "관심 학과·단체·카테고리 새 공지"],
  ["urgent", "중요 공지"],
  ["eventStart", "행사 시작 알림"],
  ["deadlineSoon", "마감 임박 알림"],
];

export default function MyPage() {
  const session = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { categories } = useCategories();
  const departments = useOrganizations("DEPARTMENT");
  const [filter, setFilter] = useState("");

  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: () => api<Profile>("/me/profile") });
  const settings = useQuery({ queryKey: ["me", "settings"], queryFn: () => api<NotificationSettings>("/me/notification-settings") });
  const saved = useQuery({
    queryKey: ["bookmarks", filter],
    queryFn: () => api<FeedItem[]>(`/me/bookmarks${filter ? `?status=${filter}` : ""}`),
  });
  const update = useMutation({
    mutationFn: (s: NotificationSettings) => api<NotificationSettings>("/me/notification-settings", { method: "PUT", body: s }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "settings"] });
      toast("알림 설정을 저장했어요.");
    },
    onError: (e) => toast(e.message),
  });

  const p = profile.data;
  const dept = (id: number) => departments.data?.find((o) => o.id === id)?.name ?? "";

  return (
    <>
      <TopBar title="MY" sub="관심 공지와 알림 설정을 관리하세요." />

      <div className="profile-card">
        <div className="avatar">{(p?.nickname ?? session?.name ?? "").slice(0, 1)}</div>
        <div>
          <h2>{p?.nickname ?? session?.name}</h2>
          <p>{p?.primaryDepartmentId ? `${dept(p.primaryDepartmentId)} · 주전공` : "주전공을 설정해 주세요"}</p>
        </div>
        <Link href="/my/interests" className="secondary" style={{ marginLeft: "auto" }}>
          관심정보 수정
        </Link>
      </div>

      {p && (
        <section className="section">
          <div className="section-heading">
            <h2>내 관심정보</h2>
          </div>
          <div className="chips">
            {p.departmentIds.map((id) => (
              <span key={`d${id}`} className="chip on">
                {dept(id)}
              </span>
            ))}
            {p.categoryIds.map((id) => (
              <span key={`c${id}`} className="chip on">
                {categories.find((c) => c.id === id)?.name}
              </span>
            ))}
            {p.departmentIds.length + p.organizationIds.length + p.categoryIds.length === 0 && (
              <span className="hint">설정된 관심 학과·단체·카테고리가 없어요.</span>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-heading">
          <h2>저장한 공지 {saved.data?.length ?? 0}</h2>
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {[["", "전체"], ...(["UPCOMING", "ONGOING", "DEADLINE_SOON", "CLOSED"] as const).map((s) => [s, STATUS_LABEL[s]])].map(
            ([v, l]) => (
              <button key={v} className={`chip ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
                {l}
              </button>
            ),
          )}
        </div>
        {saved.data && saved.data.length > 0 ? (
          <div className="notice-list">
            {saved.data.map((n) => (
              <NoticeCard key={`${n.source}-${n.id}`} item={n} />
            ))}
          </div>
        ) : (
          <div className="empty">
            아직 저장한 공지가 없어요.
            <br />
            관심 있는 공지의 북마크를 눌러 모아보세요.
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>알림 설정</h2>
        </div>
        <div className="form-card">
          <PushToggleRow />
          {SETTINGS.map(([key, label]) => (
            <div className="setting-row" key={key}>
              <span>{label}</span>
              <button
                className={`switch ${settings.data?.[key] ? "on" : ""}`}
                role="switch"
                aria-checked={!!settings.data?.[key]}
                aria-label={label}
                disabled={!settings.data || update.isPending}
                onClick={() => settings.data && update.mutate({ ...settings.data, [key]: !settings.data[key] })}
              >
                <i />
              </button>
            </div>
          ))}
          <p className="hint">푸시 발송은 준비 중이에요. 켜 두시면 준비되는 대로 이 기기로 받아요. 앱 안 알림센터에는 항상 쌓여요.</p>
        </div>
      </section>

      <section className="section">
        <button
          className="logout-wide"
          onClick={async () => {
            await unregisterPushToken().catch(() => {}); // 로그아웃한 계정의 알림이 이 기기로 오지 않게 한다
            setSession(null);
            router.replace("/login");
          }}
        >
          로그아웃
        </button>
      </section>
    </>
  );
}
