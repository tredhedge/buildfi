"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function MerciLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
