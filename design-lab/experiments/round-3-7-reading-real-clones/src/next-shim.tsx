import React, { useMemo } from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export function labHref(href: string): string {
  if (!href) return "#";
  if (
    href.startsWith("#") ||
    href.startsWith("./") ||
    href.startsWith("../") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:")
  ) {
    return href;
  }

  if (href === "/") return "./index.html";
  if (href.startsWith("/guide-")) return `../../../public${href}`;
  if (href === "/outils/decaissement") return "../round-3-5-decum-real-clone/index.html";
  if (href === "/outils/dettes") return "../round-3-4-debt-real-clone/index.html";
  if (href === "/wizard" || href.startsWith("/bilan-360")) return "../../../planner/planner_v3.html";

  return href;
}

export default function Link({ href, children, ...props }: LinkProps) {
  return (
    <a href={labHref(href)} {...props}>
      {children}
    </a>
  );
}

export function useSearchParams() {
  return useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
}
