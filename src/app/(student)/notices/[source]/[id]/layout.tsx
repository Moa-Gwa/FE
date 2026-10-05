import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

/** Server-side metadata so shared links (KakaoTalk, Everytime, ...) show the notice title in the preview. */
export async function generateMetadata({ params }: LayoutProps<"/notices/[source]/[id]">): Promise<Metadata> {
  const { source, id } = await params;
  const path = source === "crawled" ? "crawled-notices" : "notices";
  try {
    const res = await fetch(`${API}/api/${path}/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const n = (await res.json()) as { title: string; description: string | null; images: string[]; organization: { name: string } };
    const description = (n.description ?? "").replace(/\s+/g, " ").slice(0, 120);
    const image = n.images[0] ? (n.images[0].startsWith("/") ? `${API}${n.images[0]}` : n.images[0]) : undefined;
    return {
      title: `${n.title} — 모아과`,
      description: description || `${n.organization.name}의 공지`,
      openGraph: { title: n.title, description, siteName: "모아과", images: image ? [image] : undefined },
    };
  } catch {
    return {};
  }
}

export default function Layout({ children }: LayoutProps<"/notices/[source]/[id]">) {
  return children;
}
