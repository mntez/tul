"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px", background: "var(--bg)", color: "var(--ink)", padding: "24px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5 }}>Something went wrong</p>
      <p style={{ fontSize: "14px", color: "var(--ink-muted)", maxWidth: "320px", lineHeight: 1.5 }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="btn btn-primary" style={{ marginTop: "8px" }}>
        Try again
      </button>
    </div>
  );
}
