import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPost from "@/components/blog/BlogPost";
import { getPair, getPost, getVisiblePosts, postUrl } from "@/lib/blog";

// Only slugs emitted by generateStaticParams exist; anything else 404s.
// In prod that's published posts only; `next dev` also renders drafts.
export const dynamicParams = false;

export function generateStaticParams() {
  return getVisiblePosts("fr").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost("fr", slug);
  if (!post) return {};
  const url = postUrl("fr", slug);
  const pair = getPair(post);
  const languages: Record<string, string> = { "fr-CA": url, "x-default": url };
  if (pair) languages["en-CA"] = postUrl("en", pair.slug);
  return {
    title: `${post.title} | BuildFi`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      locale: "fr_CA",
      siteName: "BuildFi",
    },
    alternates: { canonical: url, languages },
    robots: post.draft ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost("fr", slug);
  if (!post) notFound();
  return <BlogPost post={post} />;
}
