import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPost from "@/components/blog/BlogPost";
import { getPair, getPost, getVisiblePosts, postUrl } from "@/lib/blog";

// Only slugs emitted by generateStaticParams exist; anything else 404s.
// In prod that's published posts only; `next dev` also renders drafts.
export const dynamicParams = false;

export function generateStaticParams() {
  return getVisiblePosts("en").map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost("en", slug);
  if (!post) return {};
  const url = postUrl("en", slug);
  const pair = getPair(post);
  // x-default points to the FR pair when it exists (FR = primary market).
  const languages: Record<string, string> = { "en-CA": url };
  if (pair) {
    const frUrl = postUrl("fr", pair.slug);
    languages["fr-CA"] = frUrl;
    languages["x-default"] = frUrl;
  } else {
    languages["x-default"] = url;
  }
  return {
    title: `${post.title} | BuildFi`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      locale: "en_CA",
      siteName: "BuildFi",
    },
    alternates: { canonical: url, languages },
    robots: post.draft ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost("en", slug);
  if (!post) notFound();
  return <BlogPost post={post} />;
}
