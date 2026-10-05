import Shell from "@/components/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell role="ADMIN">{children}</Shell>;
}
