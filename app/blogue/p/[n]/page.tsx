import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogIndex, { pageCount } from "@/components/blog/BlogIndex";
import { BLOG_PATH, SITE_BASE } from "@/lib/blog";

// Simple static pagination: /blogue is page 1, /blogue/p/2 onward here.
export const dynamicParams = false;

export function generateStaticParams() {
  const total = pageCount("fr");
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const url = `${SITE_BASE}${BLOG_PATH.fr}/p/${n}`;
  return {
    title: `Blogue — page ${n} | BuildFi`,
    description: `Articles sur la planification de la retraite au Canada — page ${n}.`,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <BlogIndex lang="fr" page={page} />;
}
