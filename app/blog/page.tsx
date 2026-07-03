import type { Metadata } from "next";
import BlogIndex from "@/components/blog/BlogIndex";
import { BLOG_PATH, SITE_BASE } from "@/lib/blog";

const URL_FR = `${SITE_BASE}${BLOG_PATH.fr}`;
const URL_EN = `${SITE_BASE}${BLOG_PATH.en}`;

export const metadata: Metadata = {
  title: "Blog — Retirement Planning | BuildFi",
  description:
    "Articles on retirement planning in Canada: QPP/CPP, OAS, GIS, RRSP-TFSA drawdown order. Analyses backed by simulations.",
  alternates: {
    canonical: URL_EN,
    languages: { "fr-CA": URL_FR, "en-CA": URL_EN, "x-default": URL_FR },
  },
  openGraph: {
    title: "Blog — Retirement Planning | BuildFi",
    description: "Articles on retirement planning in Canada, backed by simulations.",
    url: URL_EN,
    type: "website",
    locale: "en_CA",
    siteName: "BuildFi",
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <BlogIndex lang="en" page={1} />;
}
