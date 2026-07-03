import type { Metadata } from "next";
import BlogIndex from "@/components/blog/BlogIndex";
import { BLOG_PATH, SITE_BASE } from "@/lib/blog";

const URL_FR = `${SITE_BASE}${BLOG_PATH.fr}`;
const URL_EN = `${SITE_BASE}${BLOG_PATH.en}`;

export const metadata: Metadata = {
  title: "Blogue — Planification de la retraite | BuildFi",
  description:
    "Articles sur la planification de la retraite au Canada : RRQ, PSV, SRG, décaissement REER-CÉLI. Analyses appuyées sur des simulations.",
  alternates: {
    canonical: URL_FR,
    languages: { "fr-CA": URL_FR, "en-CA": URL_EN, "x-default": URL_FR },
  },
  openGraph: {
    title: "Blogue — Planification de la retraite | BuildFi",
    description:
      "Articles sur la planification de la retraite au Canada, appuyés sur des simulations.",
    url: URL_FR,
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <BlogIndex lang="fr" page={1} />;
}
