"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/session";

export default function Index() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return;
    router.replace(!session ? "/login" : session.role === "ADMIN" ? "/admin/dashboard" : "/home");
  }, [session, router]);

  return null;
}
