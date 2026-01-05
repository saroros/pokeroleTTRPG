"use client";

import { useState } from "react";

export default function ShowdownExportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e: any) {
      // Fallback: prompt (oder du machst hier ein hidden textarea)
      setError("Clipboard blocked. Copy manually from the box below.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <button type="button" onClick={copy} disabled={!text.trim()}>
        📋 Showdown export
      </button>

      {copied ? <div style={{ color: "green" }}>Copied!</div> : null}
      {error ? (
        <div style={{ color: "crimson" }}>
          {error}
          <textarea readOnly value={text} rows={10} style={{ width: "100%", marginTop: 8 }} />
        </div>
      ) : null}
    </div>
  );
}
