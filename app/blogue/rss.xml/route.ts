import { rssResponse } from "@/lib/blog-rss";

// FR feed — static at build (published posts only).
export const dynamic = "force-static";

export function GET(): Response {
  return rssResponse("fr");
}
