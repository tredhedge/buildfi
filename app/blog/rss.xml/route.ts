import { rssResponse } from "@/lib/blog-rss";

// EN feed — static at build (published posts only).
export const dynamic = "force-static";

export function GET(): Response {
  return rssResponse("en");
}
