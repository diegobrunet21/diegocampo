import React from "react";

export default function DarkCard({ children, className = "", noPadding = false, glow = null }) {
  const glowStyle = glow === "blue"
    ? { boxShadow: "0 0 0 1px rgba(59,130,246,0.15), 0 4px 24px rgba(59,130,246,0.08)" }
    : glow === "green"
    ? { boxShadow: "0 0 0 1px rgba(16,185,129,0.15), 0 4px 24px rgba(16,185,129,0.08)" }
    : { boxShadow: "0 2px 12px rgba(0,0,0,0.3)" };

  return (
    <div
      className={`rounded-2xl border border-[var(--dm-border)] bg-[var(--dm-surface)] ${noPadding ? "" : "p-5"} ${className}`}
      style={glowStyle}
    >
      {children}
    </div>
  );
}