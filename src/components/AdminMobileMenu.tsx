"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

export default function AdminMobileMenu({ children }: { children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 821px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return <>
    <header className="admin-mobile-header">
      <button type="button" className="admin-menu-button" aria-label="관리자 메뉴 열기" aria-expanded={open}
        aria-controls="admin-mobile-menu" onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <Logo />
    </header>
    <dialog ref={dialog} id="admin-mobile-menu" className="admin-mobile-drawer" aria-label="관리자 메뉴"
      onClose={() => setOpen(false)}
      onClick={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close();
        if ((event.target as HTMLElement).closest("a")) dialog.current?.close();
      }}>
      <button type="button" className="admin-menu-close" aria-label="관리자 메뉴 닫기" onClick={() => dialog.current?.close()}>×</button>
      {children}
    </dialog>
  </>;
}
