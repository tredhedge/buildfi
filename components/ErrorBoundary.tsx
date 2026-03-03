"use client";
// /components/ErrorBoundary.tsx — Reusable React error boundary
// BuildFi brand: #faf8f4, #1a2744, #C4944A

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "60vh",
          background: "#FEFCF9",
          fontFamily: "'DM Sans', -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          textAlign: "center",
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "#1a2744", marginBottom: 12,
            fontFamily: "Newsreader, Georgia, serif",
          }}>
            Oups, quelque chose s&apos;est mal passé.
          </h2>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, maxWidth: 400, marginBottom: 8 }}>
            Oops, something went wrong.
          </p>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
            Rechargez la page ou contactez-nous à{" "}
            <a href="mailto:support@buildfi.ca" style={{ color: "#C4944A", textDecoration: "none" }}>
              support@buildfi.ca
            </a>
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#C4944A",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Recharger / Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
