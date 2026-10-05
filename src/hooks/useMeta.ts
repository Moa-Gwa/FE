"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Category, OrganizationView } from "@/types";

export function useCategories() {
  const q = useQuery({
    queryKey: ["meta", "categories"],
    queryFn: () => api<Category[]>("/categories", { auth: false }),
    staleTime: Infinity,
  });
  const list = q.data ?? [];
  const byCode = (code: string | null | undefined) => (code ? (list.find((c) => c.code === code)?.name ?? code) : "기타");
  return { categories: list, byCode };
}

export function useOrganizations(type?: string) {
  return useQuery({
    queryKey: ["meta", "organizations", type ?? "all"],
    queryFn: () => api<OrganizationView[]>(`/organizations${type ? `?type=${type}` : ""}`, { auth: false }),
    staleTime: 5 * 60_000,
  });
}
