import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogIndex, { pageCount } from "@/components/blog/BlogIndex";
import { BLOG_PATH, SITE_BASE } from "@/lib/blog";

// Simple static pagination: /blog is page 1, /blog/p/2 onward here.
export const dynamicParams = false;

export function generateStaticParams() {
  const total = pageCount("en");
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const url = `${SITE_BASE}${BLOG_PATH.en}/p/${n}`;
  return {
    title: `Blog — page ${n} | BuildFi`,
    description: `Articles on retirement planning in Canada — page ${n}.`,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();
  return <BlogIndex lang="en" page={page} />;
}
