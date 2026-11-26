"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";

export default function Index() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return;
    // 비로그인도 홈부터 둘러봄. 관리자는 /login?admin=1 로 직접 들어옴
    router.replace(session?.role === "ADMIN" ? "/admin/dashboard" : "/home");
  }, [session, router]);

  return null;
}
