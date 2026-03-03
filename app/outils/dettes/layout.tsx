"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function DettesLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
