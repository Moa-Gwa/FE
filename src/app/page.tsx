"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";

export default function Index() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return;
    // 로그인 없이도 홈부터 둘러볼 수 있음. 로그인이 필요한 화면은 Shell이 /login으로 보냄
    router.replace(session?.role === "ADMIN" ? "/admin/dashboard" : "/home");
  }, [session, router]);

  return null;
}
